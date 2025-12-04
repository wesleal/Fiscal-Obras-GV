import React, { useState, useMemo, useEffect } from 'react';
import type { Inspection } from '../types';
import { InspectionStatus } from '../types';
import { Card } from './ui/Card';
import { Icon } from './ui/Icon';
import { Button } from './ui/Button';

// Declare libraries loaded from CDN
declare const XLSX: any;
declare global {
  interface Window {
    jspdf: any;
  }
}

interface InspectionListProps {
    inspections: Inspection[];
    onSelectInspection: (id: string) => void;
    initialFilter?: InspectionStatus | 'all';
}

const statusClasses: { [key in InspectionStatus]: string } = {
    [InspectionStatus.OPEN]: 'bg-blue-100 text-blue-800',
    [InspectionStatus.UNDER_REVIEW]: 'bg-purple-100 text-purple-800',
    [InspectionStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-800',
    [InspectionStatus.PENDING_FOLLOW_UP]: 'bg-orange-100 text-orange-800',
    [InspectionStatus.CLOSED]: 'bg-green-100 text-green-800',
};

type ReportFormat = 'pdf' | 'csv' | 'xlsx' | 'doc';

export const InspectionList: React.FC<InspectionListProps> = ({ inspections, onSelectInspection, initialFilter = 'all' }) => {
    const [filter, setFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<InspectionStatus | 'all'>(initialFilter);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        setStatusFilter(initialFilter);
    }, [initialFilter]);
    
    const filteredInspections = useMemo(() => {
        return inspections.filter(inspection => {
            const matchesText = filter === '' ||
                inspection.protocol.toLowerCase().includes(filter.toLowerCase()) ||
                (inspection.address && inspection.address.toLowerCase().includes(filter.toLowerCase())) ||
                inspection.type.toLowerCase().includes(filter.toLowerCase());

            const matchesStatus = statusFilter === 'all' || inspection.status === statusFilter;

            return matchesText && matchesStatus;
        });
    }, [inspections, filter, statusFilter]);

    const handleGenerateReport = async (
      reportData: Inspection[],
      format: ReportFormat
    ) => {
        setIsGenerating(true);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 500));

        const headers = ['Protocolo', 'Endereço do Reclamado / Ocorrência', 'Ponto de Referência', 'Tipo', 'Status', 'Data da Reclamação', 'Data de Abertura', 'Fiscal Responsável', 'Ações'];
        const data = reportData.map(i => ({
            'Protocolo': i.protocol,
            'Endereço do Reclamado / Ocorrência': i.address || 'N/A',
            'Ponto de Referência': i.referencePoint || 'N/A',
            'Tipo': i.type,
            'Status': i.status,
            'Data da Reclamação': i.complaintDate ? new Date(i.complaintDate + 'T00:00:00').toLocaleDateString() : 'N/A',
            'Data de Abertura': new Date(i.createdAt).toLocaleDateString(),
            'Fiscal Responsável': i.inspector || 'N/A',
            'Ações': i.actions?.join(', ') || 'N/A'
        }));

        switch(format) {
            case 'pdf':
                generatePdf(data);
                break;
            case 'csv':
                exportToCsv(headers, reportData);
                break;
            case 'xlsx':
                exportToXlsx(data);
                break;
            case 'doc':
                exportToDoc(headers, reportData);
                break;
        }

        setIsGenerating(false);
        setIsReportModalOpen(false);
    };

    const generatePdf = (reportData: any[]) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape' });

        doc.setFontSize(18);
        doc.text("Relatório de Chamados de Fiscalização", 14, 22);
        
        doc.autoTable({
            head: [Object.keys(reportData[0])],
            body: reportData.map(row => Object.values(row)),
            startY: 30,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [13, 71, 161] }
        });

        doc.save('relatorio_chamados.pdf');
    };
    
    const escapeCsvCell = (cell: string | undefined | null) => {
        if (cell === undefined || cell === null) return '';
        const strCell = String(cell);
        if (strCell.includes(',') || strCell.includes('"') || strCell.includes('\n')) {
            return `"${strCell.replace(/"/g, '""')}"`;
        }
        return strCell;
    };

    const exportToCsv = (headers: string[], data: Inspection[]) => {
        const csvRows = [
            headers.join(','),
            ...data.map(i => [
                escapeCsvCell(i.protocol),
                escapeCsvCell(i.address),
                escapeCsvCell(i.referencePoint),
                escapeCsvCell(i.type),
                escapeCsvCell(i.status),
                escapeCsvCell(i.complaintDate ? new Date(i.complaintDate + 'T00:00:00').toLocaleDateString() : ''),
                escapeCsvCell(new Date(i.createdAt).toLocaleDateString()),
                escapeCsvCell(i.inspector),
                escapeCsvCell(i.actions?.join('; ')),
            ].join(','))
        ];
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'relatorio_chamados.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToXlsx = (data: any[]) => {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Chamados");
        XLSX.writeFile(workbook, "relatorio_chamados.xlsx");
    };

    const exportToDoc = (headers: string[], data: Inspection[]) => {
        let tableHtml = `<table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
        data.forEach(i => {
            tableHtml += `<tr>
                <td>${i.protocol || ''}</td>
                <td>${i.address || ''}</td>
                <td>${i.referencePoint || ''}</td>
                <td>${i.type || ''}</td>
                <td>${i.status || ''}</td>
                <td>${i.complaintDate ? new Date(i.complaintDate + 'T00:00:00').toLocaleDateString() : ''}</td>
                <td>${new Date(i.createdAt).toLocaleDateString()}</td>
                <td>${i.inspector || 'N/A'}</td>
                <td>${i.actions?.join(', ') || 'N/A'}</td>
            </tr>`;
        });
        tableHtml += '</table>';
        
        const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Relatório</title></head><body>${tableHtml}</body></html>`;
        
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'relatorio_chamados.doc';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    return (
        <Card>
            <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h2 className="text-2xl font-bold">Lista de Chamados</h2>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative">
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Icon name="magnifyingGlass" className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar por protocolo, endereço..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue-light"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as InspectionStatus | 'all')}
                            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue-light"
                        >
                            <option value="all">Todos os Status</option>
                            {Object.values(InspectionStatus).map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                        <Button onClick={() => setIsReportModalOpen(true)} variant="secondary">
                            <Icon name="documentArrowDown" className="h-5 w-5" /> Gerar Relatório
                        </Button>
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Protocolo</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endereço do Reclamado / Ocorrência</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredInspections.map(inspection => (
                            <tr key={inspection.id} onClick={() => onSelectInspection(inspection.id)} className="hover:bg-gray-50 cursor-pointer">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{inspection.protocol}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{inspection.address || 'Não informado'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{inspection.type}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[inspection.status]}`}>
                                        {inspection.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(inspection.createdAt).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredInspections.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <Icon name="documentMagnifyingGlass" className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum chamado encontrado</h3>
                        <p className="mt-1 text-sm text-gray-500">Tente ajustar seus filtros de busca.</p>
                    </div>
                )}
            </div>
            {isReportModalOpen && (
                <ReportModal
                    onClose={() => setIsReportModalOpen(false)}
                    onGenerate={handleGenerateReport}
                    allInspections={inspections}
                    filteredInspections={filteredInspections}
                    isGenerating={isGenerating}
                />
            )}
        </Card>
    );
};

interface ReportModalProps {
    onClose: () => void;
    onGenerate: (data: Inspection[], format: ReportFormat) => void;
    allInspections: Inspection[];
    filteredInspections: Inspection[];
    isGenerating: boolean;
}

const ReportModal: React.FC<ReportModalProps> = ({ onClose, onGenerate, allInspections, filteredInspections, isGenerating }) => {
    const [reportType, setReportType] = useState<'filtered' | 'dateRange'>('filtered');
    const [format, setFormat] = useState<ReportFormat>('pdf');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const handleGenerateClick = () => {
        let dataToExport = filteredInspections;
        if (reportType === 'dateRange') {
            if (!startDate || !endDate) {
                alert("Por favor, selecione data de início e fim.");
                return;
            }
            const start = new Date(startDate).getTime();
            const end = new Date(endDate).getTime() + (24*60*60*1000 - 1); // include full end day
            dataToExport = allInspections.filter(i => {
                const inspectionDate = new Date(i.createdAt).getTime();
                return inspectionDate >= start && inspectionDate <= end;
            });
        }
        onGenerate(dataToExport, format);
    };

    const FormatButton = ({ value, icon, label }: { value: ReportFormat, icon: any, label: string }) => (
        <button
            type="button"
            onClick={() => setFormat(value)}
            className={`flex-1 p-3 rounded-lg border-2 flex flex-col items-center justify-center transition-all duration-200 ${format === value ? 'bg-brand-blue-light text-white border-brand-blue-dark shadow-md' : 'bg-gray-100 hover:bg-gray-200 border-gray-200'}`}
        >
            <Icon name={icon} className="h-8 w-8 mb-1" />
            <span className="text-sm font-semibold">{label}</span>
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold">Gerar Relatório de Chamados</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <Icon name="xMark" className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <h3 className="text-md font-semibold text-gray-800 mb-2">1. Escolha os dados</h3>
                        <div className="flex gap-4">
                            <label className="flex-1 p-3 border rounded-md cursor-pointer has-[:checked]:bg-blue-50 has-[:checked]:border-brand-blue">
                                <input type="radio" name="reportType" value="filtered" checked={reportType === 'filtered'} onChange={() => setReportType('filtered')} className="sr-only" />
                                <span className="font-bold">Usar Filtros Atuais</span>
                                <p className="text-xs text-gray-500">{filteredInspections.length} chamados na lista.</p>
                            </label>
                             <label className="flex-1 p-3 border rounded-md cursor-pointer has-[:checked]:bg-blue-50 has-[:checked]:border-brand-blue">
                                <input type="radio" name="reportType" value="dateRange" checked={reportType === 'dateRange'} onChange={() => setReportType('dateRange')} className="sr-only" />
                                <span className="font-bold">Selecionar Período</span>
                                 <p className="text-xs text-gray-500">Todos os chamados por data.</p>
                            </label>
                        </div>
                        {reportType === 'dateRange' && (
                            <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-gray-50 rounded-md">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Data de Início</label>
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700">Data de Fim</label>
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                </div>
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="text-md font-semibold text-gray-800 mb-2">2. Escolha o formato</h3>
                         <div className="flex gap-3 text-center">
                            <FormatButton value="pdf" icon="filePdf" label="PDF" />
                            <FormatButton value="xlsx" icon="fileXls" label="Excel" />
                            <FormatButton value="csv" icon="fileCsv" label="CSV" />
                            <FormatButton value="doc" icon="fileDoc" label="Word" />
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                    <Button type="button" onClick={onClose} variant="secondary">Cancelar</Button>
                    <Button onClick={handleGenerateClick} disabled={isGenerating}>
                        {isGenerating ? <><Icon name="arrowPath" className="h-5 w-5 animate-spin" /> Gerando...</> : `Gerar ${format.toUpperCase()}`}
                    </Button>
                </div>
            </div>
        </div>
    );
};