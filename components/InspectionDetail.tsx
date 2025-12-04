
import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { Inspection, Photo, HistoryEntry, User } from '../types';
import { InspectionStatus, InspectionAction, InspectionType } from '../types';
import { inspectionService } from '../services/inspectionService';
import { geminiService } from '../services/geminiService';
import { Card } from './ui/Card';
import { Icon } from './ui/Icon';
import { Button } from './ui/Button';

// FIX: Declare google to fix missing type errors for Google Maps API
declare const google: any;

declare global {
  interface Window {
    jspdf: any;
  }
}

interface InspectionDetailProps {
    inspectionId: string;
    onBack: () => void;
    onInspectionUpdated: () => void;
    isMapApiLoaded: boolean;
    currentUser: User;
}

const statusConfig = {
    [InspectionStatus.OPEN]: { icon: 'file', color: 'text-blue-500', bgColor: 'bg-blue-100' },
    [InspectionStatus.UNDER_REVIEW]: { icon: 'eye', color: 'text-purple-500', bgColor: 'bg-purple-100' },
    [InspectionStatus.IN_PROGRESS]: { icon: 'clock', color: 'text-yellow-500', bgColor: 'bg-yellow-100' },
    [InspectionStatus.PENDING_FOLLOW_UP]: { icon: 'arrowPath', color: 'text-orange-500', bgColor: 'bg-orange-100' },
    [InspectionStatus.CLOSED]: { icon: 'checkCircle', color: 'text-green-500', bgColor: 'bg-green-100' },
};

const actionConfig: Record<InspectionAction, { icon: any }> = {
    [InspectionAction.ORIENTED]: { icon: 'chatBubbleLeftRight' },
    [InspectionAction.NOTIFICATION]: { icon: 'documentText' },
    [InspectionAction.FINE]: { icon: 'receiptPercent' },
    [InspectionAction.SEIZURE]: { icon: 'archiveBoxArrowDown' },
    [InspectionAction.EMBARGO]: { icon: 'noSymbol' },
    [InspectionAction.INTERDICTION]: { icon: 'lockClosed' },
    [InspectionAction.DEMOLITION]: { icon: 'buildingSlash' },
};


const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const InspectionDetail: React.FC<InspectionDetailProps> = ({ inspectionId, onBack, onInspectionUpdated, isMapApiLoaded, currentUser }) => {
    const [inspection, setInspection] = useState<Inspection | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
    
    // Editable state
    const [currentStatus, setCurrentStatus] = useState<InspectionStatus | null>(null);
    const [reportText, setReportText] = useState('');
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [newPhotos, setNewPhotos] = useState<File[]>([]);
    const [actions, setActions] = useState<Set<InspectionAction>>(new Set());
    const [verifiedInfractions, setVerifiedInfractions] = useState<Partial<Record<InspectionType, boolean>>>({});
    const [followUpDate, setFollowUpDate] = useState('');
    const [followUpNotes, setFollowUpNotes] = useState('');
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    
    const mapRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const statusDropdownRef = useRef<HTMLDivElement>(null);

    const fetchInspection = useCallback(async () => {
        setIsLoading(true);
        const data = await inspectionService.getInspectionById(inspectionId);
        if (data) {
            setInspection(data);
            setCurrentStatus(data.status);
            setReportText(data.report || '');
            setPhotos(data.photos || []);
            setActions(new Set(data.actions || []));
            setVerifiedInfractions(data.verifiedInfractions || {});
        }
        setIsLoading(false);
    }, [inspectionId]);

    useEffect(() => {
        fetchInspection();
    }, [fetchInspection]);

    useEffect(() => {
        if (isMapApiLoaded && inspection?.latitude && inspection?.longitude && mapRef.current) {
            const location = { lat: inspection.latitude, lng: inspection.longitude };
            const map = new google.maps.Map(mapRef.current, {
                center: location,
                zoom: 17,
                disableDefaultUI: true,
            });
            new google.maps.Marker({
                position: location,
                map: map,
                title: inspection.address,
            });
        }
    }, [isMapApiLoaded, inspection]);
    
     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
                setIsStatusDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const allPhotosForGallery = [
        ...photos,
        ...newPhotos.map((p, i) => ({
            id: `new-${i}`,
            url: URL.createObjectURL(p),
            name: p.name,
            uploadedAt: new Date().toISOString(),
        }))
    ];

    const handleOpenGallery = (index: number) => {
        setSelectedPhotoIndex(index);
        setIsGalleryOpen(true);
    };
    
    const handleCloseGallery = () => setIsGalleryOpen(false);

    const handleNextPhoto = () => {
        setSelectedPhotoIndex((prevIndex) => (prevIndex + 1) % allPhotosForGallery.length);
    };

    const handlePrevPhoto = () => {
        setSelectedPhotoIndex((prevIndex) => (prevIndex - 1 + allPhotosForGallery.length) % allPhotosForGallery.length);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isGalleryOpen) return;
            if (e.key === 'ArrowRight') handleNextPhoto();
            if (e.key === 'ArrowLeft') handlePrevPhoto();
            if (e.key === 'Escape') handleCloseGallery();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isGalleryOpen, allPhotosForGallery.length]);


    const handleGenerateSummary = async () => {
        if (!reportText) return;
        setIsSummarizing(true);
        const summary = await geminiService.summarizeText(reportText);
        if (inspection) {
            await inspectionService.updateInspection(inspection.id, { reportSummary: summary });
            setInspection(prev => prev ? { ...prev, reportSummary: summary } : null);
        }
        setIsSummarizing(false);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setNewPhotos(prev => [...prev, ...Array.from(event.target.files!)]);
        }
    };

    const handleActionToggle = (action: InspectionAction) => {
        setActions(prev => {
            const newActions = new Set(prev);
            if (newActions.has(action)) {
                newActions.delete(action);
            } else {
                newActions.add(action);
            }
            return newActions;
        });
    };
    
    const handleInfractionCheckChange = (checkType: InspectionType) => {
        setVerifiedInfractions(prev => ({
            ...prev,
            [checkType]: !prev[checkType],
        }));
    };

    const closeCamera = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      setIsCameraOpen(false);
    };

    const handleTakePhotoClick = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsCameraOpen(true);
      } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Não foi possível acessar a câmera. Verifique as permissões do seu navegador.");
      }
    };

    const handleCapturePhoto = () => {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const fileName = `captura-${new Date().toISOString()}.jpg`;
            const file = new File([blob], fileName, { type: 'image/jpeg' });
            setNewPhotos(prev => [...prev, file]);
          }
          closeCamera();
        }, 'image/jpeg');
      }
    };

    const handleSave = async () => {
        if (!inspection) return;
        setIsSaving(true);
        
        let updateData: Partial<Inspection> = {
            status: currentStatus || inspection.status,
            report: reportText,
            actions: Array.from(actions),
            verifiedInfractions,
        };
        
        for (const file of newPhotos) {
            const base64 = await fileToBase64(file);
            await inspectionService.addPhoto(inspection.id, { url: base64, name: file.name });
        }

        if (followUpDate && followUpNotes) {
            await inspectionService.addFollowUp(inspection.id, { date: followUpDate, notes: followUpNotes });
            updateData.status = InspectionStatus.PENDING_FOLLOW_UP;
        }
        
        await inspectionService.updateInspection(inspection.id, updateData);
        setIsSaving(false);
        onInspectionUpdated();
    };

    const handleGeneratePdf = async () => {
        if (!inspection) return;
        setIsGeneratingPdf(true);

        const currentData = await inspectionService.getInspectionById(inspection.id);
        if(!currentData) {
            setIsGeneratingPdf(false);
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const pageHeight = doc.internal.pageSize.height;
            const pageWidth = doc.internal.pageSize.width;
            const margin = 15;
            let y = 0; // Start at 0, header will set initial y

            const addPageWithHeaderAndFooter = () => {
                y = margin;
                
                // Add the main title
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                const mainTitle = 'GERÊNCIA DE FISCALIZAÇÃO DE OBRAS';
                doc.text(mainTitle, pageWidth / 2, y, { align: 'center' });
                y += 8;

                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
                const subTitle = 'RELATÓRIO DE FISCALIZAÇÃO';
                doc.text(subTitle, pageWidth / 2, y, { align: 'center' });
                y += 8;

                // Add a separator line
                doc.setDrawColor(200, 200, 200);
                doc.line(margin, y, pageWidth - margin, y);
                y += 10;
            };

            const checkPageBreak = (neededHeight: number) => {
                if (y + neededHeight > pageHeight - 20) { // Check against page height minus footer margin
                    doc.addPage();
                    addPageWithHeaderAndFooter();
                }
            };
            
            const addFooter = (doc: any) => {
                doc.setFontSize(8);
                doc.setTextColor(150);
                const pageCount = doc.internal.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    const footerText = `Página ${i} de ${pageCount}`;
                    doc.text(footerText, pageWidth - margin, pageHeight - 10, { align: 'right' });
                }
            };

            const addSectionHeader = (title: string) => {
                checkPageBreak(15);
                y += 5;
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setFillColor(243, 244, 246); // gray-100
                doc.rect(margin, y, contentWidth, 8, 'F');
                doc.setTextColor(55, 65, 81); // gray-700
                doc.text(title, margin + 3, y + 6);
                y += 12;
            };

            const addGridField = (label1: string, value1: string, label2: string, value2: string) => {
                checkPageBreak(15); // Approximate height for a grid row
                doc.setFontSize(8);
                doc.setTextColor(107, 114, 128); // gray-500
                doc.text(label1, col1X, y);
                doc.text(label2, col2X, y);

                doc.setFontSize(10);
                doc.setTextColor(0);
                doc.setFont('helvetica', 'normal');
                
                const splitValue1 = doc.splitTextToSize(value1, col2Width);
                doc.text(splitValue1, col1X, y + 4);

                const splitValue2 = doc.splitTextToSize(value2, col2Width);
                doc.text(splitValue2, col2X, y + 4);
                
                y += Math.max(splitValue1.length, splitValue2.length) * 4 + 4;
            };
            
            const addFullWidthField = (label: string, value: string) => {
                if (!value?.trim()) return;
                checkPageBreak(15 + doc.splitTextToSize(value, contentWidth).length * 4);
                doc.setFontSize(8);
                doc.setTextColor(107, 114, 128); // gray-500
                doc.text(label, margin, y);
                
                doc.setFontSize(10);
                doc.setTextColor(0);
                doc.setFont('helvetica', 'normal');
                const splitValue = doc.splitTextToSize(value, contentWidth);
                doc.text(splitValue, margin, y + 4);
                y += splitValue.length * 4 + 4;
            };
            
            const addBulletedList = (items: string[]) => {
                if (!items || items.length === 0) return;
                 items.forEach(item => {
                    const line = `- ${item}`;
                    const splitLine = doc.splitTextToSize(line, contentWidth - 2);
                    checkPageBreak(splitLine.length * 4 + 2);
                    doc.text(splitLine, margin + 2, y);
                    y += splitLine.length * 4 + 1;
                });
                y += 3;
            };

            // --- PDF CONTENT START ---
            
            addPageWithHeaderAndFooter();

            const contentWidth = pageWidth - (margin * 2);
            const col1X = margin;
            const col2X = margin + contentWidth / 2 + 5;
            const col2Width = contentWidth / 2 - 5;

            addSectionHeader("Dados do Chamado");
            addGridField("PROTOCOLO", currentData.protocol, "STATUS ATUAL", currentData.status);
            addGridField("DATA DE ABERTURA", new Date(currentData.createdAt).toLocaleString(), "DATA DA RECLAMAÇÃO", currentData.complaintDate ? new Date(currentData.complaintDate + 'T00:00:00').toLocaleDateString() : 'N/A');
            addGridField("ORIGEM", currentData.source, "TIPO DE FISCALIZAÇÃO", currentData.type);
            addGridField("FISCAL RESPONSÁVEL", currentData.inspector || 'N/A', "", "");

            addSectionHeader("Localização & Partes Envolvidas");
            addFullWidthField("ENDEREÇO DO RECLAMADO", currentData.address);
            addFullWidthField("PONTO DE REFERÊNCIA", currentData.referencePoint);
            addGridField("RECLAMANTE", currentData.complainantName || 'N/A', "RECLAMADO", currentData.respondentName || 'N/A');
            addGridField("ENDEREÇO DO RECLAMANTE", currentData.complainantAddress || 'N/A', "TELEFONE DE CONTATO", currentData.contactPhone || 'N/A');
            
            addSectionHeader("Descrição Inicial da Ocorrência");
            addFullWidthField("", currentData.description || 'Nenhuma descrição fornecida.');

            addSectionHeader("Constatação da Fiscalização");
            addFullWidthField("RELATÓRIO DA CONSTATAÇÃO", currentData.report);
            
            doc.setFontSize(8);
            doc.setTextColor(107, 114, 128); // gray-500
            doc.text("TIPOS DE INFRAÇÃO VERIFICADA", margin, y);
            y+=4;
            const verifiedInfractionsList = Object.entries(currentData.verifiedInfractions)
                .filter(([, value]) => value === true)
                .map(([key]) => key);
            addBulletedList(verifiedInfractionsList.length > 0 ? verifiedInfractionsList : ["Nenhuma infração verificada."]);

            doc.setFontSize(8);
            doc.setTextColor(107, 114, 128); // gray-500
            doc.text("AÇÕES DA FISCALIZAÇÃO", margin, y);
            y+=4;
            addBulletedList(currentData.actions.length > 0 ? currentData.actions : ["Nenhuma ação registrada."]);

            addSectionHeader("Evidências Anexadas");
             if (currentData.photos && currentData.photos.length > 0) {
                doc.setFontSize(8);
                doc.setTextColor(107, 114, 128); // gray-500
                doc.text("RELATÓRIO FOTOGRÁFICO", margin, y);
                y += 5;
                
                const photoWidth = (contentWidth - 5) / 2; // Two photos per row with a gap
                let photoX = margin;

                for (let i = 0; i < currentData.photos.length; i++) {
                    const photo = currentData.photos[i];
                    try {
                        const imgProps = doc.getImageProperties(photo.url);
                        const photoHeight = (imgProps.height * photoWidth) / imgProps.width;

                        checkPageBreak(photoHeight + 5);
                        doc.addImage(photo.url, 'JPEG', photoX, y, photoWidth, photoHeight);

                        if ((i + 1) % 2 === 0) { // Move to next row
                            photoX = margin;
                            y += photoHeight + 5;
                        } else if (i < currentData.photos.length - 1) { // Move to next column
                            photoX += photoWidth + 5;
                        } else { // Last photo
                             y += photoHeight + 5;
                        }
                    } catch (e) {
                         console.error("Error adding image to PDF:", e);
                    }
                }
                 photoX = margin; // Reset for next section
            }
            
            if (currentData.attachments && currentData.attachments.length > 0) {
                 doc.setFontSize(8);
                doc.setTextColor(107, 114, 128); // gray-500
                doc.text("DOCUMENTOS ANEXADOS NA ABERTURA", margin, y);
                y += 4;
                addBulletedList(currentData.attachments.map(a => a.name));
            }

            if(currentData.followUps && currentData.followUps.length > 0) {
                 addSectionHeader("Agendamentos de Retorno");
                 currentData.followUps.forEach(f => {
                    addGridField(
                        `DATA: ${new Date(f.date + 'T00:00:00').toLocaleDateString()}`, `Status: ${f.completed ? 'Concluído' : 'Pendente'}`,
                        "OBSERVAÇÕES", f.notes
                    );
                 });
            }

            // Add signature line
            y += 20; // Add some space before the signature line
            checkPageBreak(20); // Make sure there's enough room for signature area
            const signatureLineWidth = 100;
            const signatureLineXStart = (pageWidth - signatureLineWidth) / 2;
            doc.setDrawColor(0, 0, 0);
            doc.line(signatureLineXStart, y, signatureLineXStart + signatureLineWidth, y);
            y += 5; // Move cursor down for the text
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text("Fiscal de Obras e Urbanismo", pageWidth / 2, y, { align: 'center' });

            // --- PDF CONTENT END ---

            addFooter(doc);
            doc.save(`Relatorio-Fiscalizacao-${currentData.protocol}.pdf`);
        } catch (error) {
            console.error("Failed to generate PDF:", error);
            alert("Ocorreu um erro ao gerar o PDF. Verifique o console para mais detalhes.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    if (isLoading || !inspection || !currentStatus) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-brand-blue"></div></div>;

    const { icon, color, bgColor } = statusConfig[currentStatus];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-brand-blue">
                    <Icon name="arrowLeft" className="h-5 w-5" /> Voltar para a lista
                </button>
                 <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf} variant="secondary">
                    {isGeneratingPdf ? <><Icon name="arrowPath" className="h-5 w-5 animate-spin" /> Gerando PDF...</> : <><Icon name="documentArrowDown" className="h-5 w-5" /> Gerar Relatório PDF</>}
                </Button>
            </div>

            <Card>
                <div className="p-6 border-b border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">{inspection.address || 'Endereço não informado'}</h2>
                            <p className="text-sm text-gray-500">Protocolo: {inspection.protocol}</p>
                        </div>
                        <div className="relative" ref={statusDropdownRef}>
                            <button
                                onClick={() => setIsStatusDropdownOpen(prev => !prev)}
                                className={`mt-2 sm:mt-0 flex items-center gap-2 px-3 py-1 text-sm font-semibold rounded-full ${bgColor} ${color} cursor-pointer hover:opacity-80 transition-opacity`}
                            >
                                <Icon name={icon as any} className="h-4 w-4" />
                                <span>{currentStatus}</span>
                                <Icon name={isStatusDropdownOpen ? 'chevronUp' : 'chevronDown'} className="h-4 w-4" />
                            </button>
                            {isStatusDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-10 border">
                                    <ul className="py-1">
                                        {Object.values(InspectionStatus).map(status => {
                                            const config = statusConfig[status];
                                            return (
                                                <li key={status}>
                                                    <button
                                                        onClick={() => {
                                                            setCurrentStatus(status);
                                                            setIsStatusDropdownOpen(false);
                                                        }}
                                                        className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                    >
                                                        <Icon name={config.icon as any} className={`h-4 w-4 ${config.color}`} />
                                                        {status}
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                    <div><strong className="text-gray-500 block">Tipo:</strong> {inspection.type}</div>
                    <div><strong className="text-gray-500 block">Origem:</strong> {inspection.source}</div>
                    <div><strong className="text-gray-500 block">Data Abertura:</strong> {new Date(inspection.createdAt).toLocaleString()}</div>
                    {inspection.referencePoint && <div className="md:col-span-2"><strong className="text-gray-500 block">Ponto de Referência:</strong> {inspection.referencePoint}</div>}
                    {inspection.complaintDate && <div><strong className="text-gray-500 block">Data da Reclamação:</strong> {new Date(inspection.complaintDate + 'T00:00:00').toLocaleDateString()}</div>}
                    <div className="md:col-span-3"><strong className="text-gray-500 block">Descrição Inicial:</strong> {inspection.description || 'Nenhuma descrição fornecida.'}</div>
                </div>
                
                {inspection.attachments.length > 0 && (
                     <div className="p-6 border-t border-gray-200">
                        <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
                            <Icon name="paperClip" className="h-5 w-5 text-gray-600" />
                            Documentos Anexados na Abertura
                        </h3>
                         <ul className="border border-gray-200 rounded-md divide-y divide-gray-200">
                             {inspection.attachments.map((file, index) => (
                                <li key={index} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                                    <div className="w-0 flex-1 flex items-center">
                                        <Icon name="file" className="flex-shrink-0 h-5 w-5 text-gray-400" />
                                        <a href={file.data} target="_blank" rel="noopener noreferrer" className="ml-2 flex-1 w-0 truncate hover:underline text-brand-blue">{file.name}</a>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {(inspection.complainantName || inspection.respondentName || inspection.complainantAddress || inspection.contactPhone) && (
                    <div className="p-6 border-t border-gray-200">
                        <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
                            <Icon name="users" className="h-5 w-5 text-gray-600" />
                            Partes Envolvidas
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {inspection.complainantName && <div><strong className="text-gray-500 block">Reclamante:</strong> {inspection.complainantName}</div>}
                            {inspection.respondentName && <div><strong className="text-gray-500 block">Reclamado:</strong> {inspection.respondentName}</div>}
                            {inspection.complainantAddress && <div className="md:col-span-2"><strong className="text-gray-500 block">Endereço do Reclamante:</strong> {inspection.complainantAddress}</div>}
                            {inspection.contactPhone && <div><strong className="text-gray-500 block">Telefone de Contato:</strong> {inspection.contactPhone}</div>}
                        </div>
                    </div>
                )}
                
                 {isMapApiLoaded && inspection.latitude && inspection.longitude && (
                     <div ref={mapRef} className="h-64 w-full bg-gray-200" />
                 )}
            </Card>

            <Card>
                <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Icon name="clipboardDocumentCheck" className="h-6 w-6" />
                        Tipo de Infração Verificada
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Object.values(InspectionType).map(check => (
                             <label key={check} className="flex items-center p-3 border rounded-md cursor-pointer transition-colors has-[:checked]:bg-blue-50 has-[:checked]:border-brand-blue has-[:checked]:text-brand-blue-dark">
                                <input
                                    type="checkbox"
                                    checked={!!verifiedInfractions[check]}
                                    onChange={() => handleInfractionCheckChange(check)}
                                    className="h-5 w-5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue-light"
                                />
                                <span className="ml-3 font-medium text-sm">{check}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </Card>

            <Card>
                <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Ações da Fiscalização</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {Object.values(InspectionAction).map(action => (
                            <label key={action} className="flex items-center p-3 border rounded-md cursor-pointer transition-colors has-[:checked]:bg-blue-50 has-[:checked]:border-brand-blue has-[:checked]:text-brand-blue-dark">
                                <input
                                    type="checkbox"
                                    checked={actions.has(action)}
                                    onChange={() => handleActionToggle(action)}
                                    className="h-5 w-5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue-light"
                                />
                                <span className="ml-3 font-medium text-sm flex items-center gap-2">
                                    <Icon name={actionConfig[action].icon} className="h-5 w-5" />
                                    {action}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            </Card>


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <Card>
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Icon name="pencilSquare" className="h-5 w-5" />Relatório da Constatação</h3>
                            <textarea
                                value={reportText}
                                onChange={e => setReportText(e.target.value)}
                                rows={8}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue-light"
                                placeholder="Descreva os fatos constatados durante a diligência..."
                            />
                             {inspection.reportSummary && (
                                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                    <h4 className="font-semibold text-blue-800 flex items-center gap-2"><Icon name="sparkles" className="h-5 w-5" />Resumo (IA)</h4>
                                    <p className="text-sm text-blue-700 mt-1">{inspection.reportSummary}</p>
                                </div>
                            )}
                            <div className="mt-4">
                                <Button onClick={handleGenerateSummary} disabled={isSummarizing || !reportText}>
                                    {isSummarizing ? <><Icon name="arrowPath" className="h-5 w-5 animate-spin" /> Gerando...</> : <><Icon name="sparkles" className="h-5 w-5" />Gerar Resumo com IA</>}
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <Card>
                         <div className="p-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Icon name="camera" className="h-5 w-5" />Relatório Fotográfico</h3>
                            <div className="flex items-center gap-4">
                                <label className="block">
                                    <span className="sr-only">Choose profile photo</span>
                                    <input type="file" multiple onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-brand-blue hover:file:bg-blue-100" />
                                </label>
                                <Button type="button" onClick={handleTakePhotoClick} variant="secondary">
                                    <Icon name="camera" className="h-5 w-5" />
                                    Tirar Foto
                                </Button>
                            </div>
                            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {allPhotosForGallery.map((p, index) => (
                                    <button key={p.id} onClick={() => handleOpenGallery(index)} className="relative aspect-square w-full h-auto overflow-hidden rounded-md group">
                                        <img src={p.url} alt={p.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center transition-all duration-300">
                                             <Icon name="magnifyingGlass" className="h-8 w-8 text-white opacity-0 group-hover:opacity-100" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                     <Card>
                        <div className="p-6">
                             <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Icon name="calendarDays" className="h-5 w-5" />Agendar Retorno</h3>
                             <div className="space-y-4">
                                <div>
                                    <label htmlFor="followUpDate" className="block text-sm font-medium text-gray-700">Data do Retorno</label>
                                    <input type="date" id="followUpDate" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue-light" />
                                </div>
                                 <div>
                                    <label htmlFor="followUpNotes" className="block text-sm font-medium text-gray-700">Observações do Retorno</label>
                                    <textarea 
                                        id="followUpNotes" 
                                        value={followUpNotes} 
                                        onChange={e => setFollowUpNotes(e.target.value)} 
                                        rows={4} 
                                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue-light" 
                                        placeholder="Descreva o que precisa ser verificado no retorno..."
                                    />
                                </div>
                             </div>
                        </div>
                    </Card>
                    <Card>
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Icon name="clock" className="h-5 w-5" />
                                Histórico de Alterações
                            </h3>
                            <div className="max-h-80 overflow-y-auto pr-2">
                                <ul className="space-y-4">
                                    {inspection.history.map((entry: HistoryEntry) => (
                                        <li key={entry.timestamp} className="flex gap-3">
                                            <div className="flex-shrink-0 pt-1">
                                                <div className="h-4 w-4 rounded-full bg-gray-200 flex items-center justify-center">
                                                    <Icon name="check" className="h-2.5 w-2.5 text-gray-500" />
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">{entry.change}</p>
                                                <p className="text-xs text-gray-500">
                                                    Por: {entry.user} em {new Date(entry.timestamp).toLocaleString()}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
            <div className="pt-6 border-t border-gray-200 flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <><Icon name="arrowPath" className="h-5 w-5 animate-spin" /> Salvando...</> : <><Icon name="check" className="h-5 w-5" /> Salvar Alterações</>}
                </Button>
            </div>

            {isCameraOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex flex-col items-center justify-center p-4">
                    <video ref={videoRef} autoPlay playsInline className="max-w-full max-h-[80vh] rounded-lg shadow-lg"></video>
                    <canvas ref={canvasRef} className="hidden"></canvas>
                    <div className="mt-4 flex gap-4">
                        <Button onClick={handleCapturePhoto}>
                            <Icon name="camera" className="h-6 w-6" /> Capturar
                        </Button>
                        <Button onClick={closeCamera} variant="secondary">
                            <Icon name="xMark" className="h-6 w-6" /> Cancelar
                        </Button>
                    </div>
                </div>
            )}
            
            {isGalleryOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <button onClick={handleCloseGallery} className="absolute top-4 right-4 text-white hover:text-gray-300 z-50">
                        <Icon name="xMark" className="h-10 w-10" />
                    </button>
                    
                    <button onClick={handlePrevPhoto} className="absolute left-4 text-white hover:text-gray-300 p-2 bg-black bg-opacity-20 rounded-full">
                        <Icon name="arrowLeft" className="h-8 w-8" />
                    </button>
                    
                    <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center">
                        <img 
                            src={allPhotosForGallery[selectedPhotoIndex].url} 
                            alt={allPhotosForGallery[selectedPhotoIndex].name}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        />
                        <div className="mt-4 text-center text-white bg-black bg-opacity-50 px-4 py-2 rounded-lg">
                            <p className="font-bold">{allPhotosForGallery[selectedPhotoIndex].name}</p>
                            <p className="text-sm">Upload em: {new Date(allPhotosForGallery[selectedPhotoIndex].uploadedAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                    
                     <button onClick={handleNextPhoto} className="absolute right-4 text-white hover:text-gray-300 p-2 bg-black bg-opacity-20 rounded-full">
                        <Icon name="arrowRight" className="h-8 w-8" />
                    </button>
                </div>
            )}
        </div>
    );
};
