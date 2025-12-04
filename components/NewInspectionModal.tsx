
import React, { useState } from 'react';
import { inspectionService } from '../services/inspectionService';
import { InspectionSource, InspectionType } from '../types';
import type { Inspection, Attachment, User } from '../types';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';
import { uploadFoto } from '../services/upload';
import { supabase } from '../src/lib/supabase';

interface NewInspectionModalProps {
    onClose: () => void;
    onInspectionCreated: (newInspection: Inspection) => void;
    currentUser: User;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const FormRow: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 ${className}`}>
        {children}
    </div>
);

const FormField: React.FC<{ label: string; children: React.ReactNode; className?: string; fullWidth?: boolean }> = ({ label, children, className, fullWidth }) => (
    <div className={fullWidth ? `md:col-span-2 ${className}` : className}>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        {children}
    </div>
);

export const NewInspectionModal: React.FC<NewInspectionModalProps> = ({ onClose, onInspectionCreated, currentUser }) => {
    const [formData, setFormData] = useState({
        complainantName: '',
        complainantAddress: '',
        contactPhone: '',
        respondentName: '',
        address: '',
        referencePoint: '',
        complaintDate: '',
        source: InspectionSource.INTERNAL,
        type: InspectionType.CONSTRUCTION_PERMIT,
        description: '',
        inspector: '',
    });
    
    const [isSaving, setIsSaving] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setAttachments(prev => [...prev, ...Array.from(event.target.files!)]);
        }
    };

    const handleRemoveAttachment = (fileToRemove: File) => {
        setAttachments(prev => prev.filter(file => file !== fileToRemove));
    };

   const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSaving(true);

  try {
    // 1. Upload das fotos para o Supabase
    const uploadedUrls = await Promise.all(
      attachments.map((file) => uploadFoto(file))
    );

    // Seleciona a primeira foto válida (caso exista)
    const fotoUrl = uploadedUrls.filter((u) => u !== null)[0] ?? null;

    // 2. Salva dados mínimos da fiscalização no Supabase
    const { error } = await supabase
      .from('fiscalizacoes')
      .insert({
        observacao: formData.description,
        foto_url: fotoUrl,
        endereco: formData.address,
        reclamante_nome: formData.complainantName,
        reclamado_nome: formData.respondentName,
      });

    if (error) {
      console.error('Erro ao salvar no Supabase:', error);
      alert('Erro ao salvar no banco de dados.');
      return;
    }

    // 3. Fluxo original da interface (base64 + inspectionService)
    const processedAttachments: Attachment[] = await Promise.all(
      attachments.map(async (file) => ({
        name: file.name,
        type: file.type,
        data: await fileToBase64(file),
      }))
    );

    const newInspectionData = {
      ...formData,
      attachments: processedAttachments,
    };

    const createdInspection = await inspectionService.createInspection(
      newInspectionData,
      currentUser
    );

    onInspectionCreated(createdInspection);
    onClose(); // fecha modal ao finalizar
  } finally {
    setIsSaving(false);
  }
};


        const processedAttachments: Attachment[] = await Promise.all(
            attachments.map(async (file) => ({
                name: file.name,
                type: file.type,
                data: await fileToBase64(file),
            }))
        );

        const newInspectionData = {
            ...formData,
            attachments: processedAttachments,
        };
        const createdInspection = await inspectionService.createInspection(newInspectionData, currentUser);
        onInspectionCreated(createdInspection);
        setIsSaving(false);
    };

    const inputClasses = "w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue-light focus:border-transparent shadow-sm text-sm";
    const selectClasses = "w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue-light focus:border-transparent shadow-sm text-sm bg-white";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="relative flex items-center justify-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 uppercase text-center mx-8">
                        SOLICITAÇÃO DE DILIGÊNCIA DA FISCALIZAÇÃO DE OBRAS
                    </h2>
                    <button 
                        onClick={onClose} 
                        className="absolute top-1/2 right-6 -translate-y-1/2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
                    >
                        <Icon name="xMark" className="h-6 w-6" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="p-6 space-y-8">
                        
                        {/* Seção 1: Dados do Reclamante */}
                        <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
                             <div className="flex items-center gap-2 mb-4 text-brand-blue-dark border-b border-gray-200 pb-2">
                                <Icon name="users" className="h-5 w-5" />
                                <h3 className="text-lg font-semibold">Dados do Reclamante</h3>
                             </div>
                             <FormRow>
                                <FormField label="Nome do Reclamante">
                                    <input type="text" name="complainantName" value={formData.complainantName} onChange={handleChange} className={inputClasses} placeholder="Nome completo" />
                                </FormField>
                                <FormField label="Telefone para Contato">
                                    <input type="tel" name="contactPhone" value={formData.contactPhone} onChange={handleChange} className={inputClasses} placeholder="(33) 99999-9999" />
                                </FormField>
                                <FormField label="Endereço do Reclamante" fullWidth>
                                    <input type="text" name="complainantAddress" value={formData.complainantAddress} onChange={handleChange} className={inputClasses} placeholder="Rua, Número, Bairro" />
                                </FormField>
                                <FormField label="Data da Reclamação">
                                    <input type="date" name="complaintDate" value={formData.complaintDate} onChange={handleChange} className={inputClasses} />
                                </FormField>
                             </FormRow>
                        </div>

                        {/* Seção 2: Dados do Local / Reclamado */}
                        <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
                            <div className="flex items-center gap-2 mb-4 text-brand-blue-dark border-b border-gray-200 pb-2">
                                <Icon name="buildingSlash" className="h-5 w-5" />
                                <h3 className="text-lg font-semibold">Dados do Local / Reclamado</h3>
                            </div>
                            <FormRow>
                                <FormField label="Nome do Reclamado">
                                    <input type="text" name="respondentName" value={formData.respondentName} onChange={handleChange} className={inputClasses} placeholder="Nome do proprietário ou responsável" />
                                </FormField>
                                <FormField label="Endereço do Reclamado / Ocorrência" fullWidth>
                                     <input type="text" name="address" value={formData.address} onChange={handleChange} className={inputClasses} placeholder="Endereço completo onde ocorre a infração" />
                                </FormField>
                                <FormField label="Ponto de Referência" fullWidth>
                                    <input type="text" name="referencePoint" value={formData.referencePoint} onChange={handleChange} className={inputClasses} placeholder="Ex: Próximo à padaria..." />
                                </FormField>
                            </FormRow>
                        </div>

                        {/* Seção 3: Detalhes da Fiscalização */}
                        <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
                            <div className="flex items-center gap-2 mb-4 text-brand-blue-dark border-b border-gray-200 pb-2">
                                <Icon name="clipboardDocumentCheck" className="h-5 w-5" />
                                <h3 className="text-lg font-semibold">Detalhes da Fiscalização</h3>
                            </div>
                            <FormRow>
                                <FormField label="Origem do Chamado">
                                    <select name="source" value={formData.source} onChange={handleChange} className={selectClasses}>
                                        {Object.values(InspectionSource).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </FormField>
                                <FormField label="Tipo de Fiscalização Solicitada">
                                    <select name="type" value={formData.type} onChange={handleChange} className={selectClasses}>
                                        {Object.values(InspectionType).map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </FormField>
                                 <FormField label="Descrição do Fato" fullWidth>
                                    <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className={inputClasses} placeholder="Descreva detalhadamente a denúncia ou motivo da fiscalização..." />
                                </FormField>
                                <FormField label="Fiscal Responsável (Opcional)">
                                    <input type="text" name="inspector" value={formData.inspector} onChange={handleChange} className={inputClasses} placeholder="Nome do fiscal designado" />
                                </FormField>
                            </FormRow>
                        </div>
                        
                        {/* Seção 4: Documentação */}
                        <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
                             <div className="flex items-center gap-2 mb-4 text-brand-blue-dark border-b border-gray-200 pb-2">
                                <Icon name="paperClip" className="h-5 w-5" />
                                <h3 className="text-lg font-semibold">Documentação Anexa</h3>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Anexar Arquivos (Imagens ou PDF)</label>
                                <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer relative">
                                    <input id="file-upload" name="file-upload" type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept="image/*,.pdf" />
                                    <div className="space-y-1 text-center pointer-events-none">
                                        <Icon name="paperClip" className="mx-auto h-12 w-12 text-gray-400" />
                                        <div className="flex text-sm text-gray-600 justify-center">
                                            <span className="font-medium text-brand-blue hover:text-brand-blue-dark">Clique para enviar</span>
                                            <p className="pl-1">ou arraste e solte</p>
                                        </div>
                                        <p className="text-xs text-gray-500">PNG, JPG, PDF até 10MB</p>
                                    </div>
                                </div>
                                 {attachments.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="text-sm font-medium text-gray-800 mb-2">Arquivos selecionados:</h4>
                                        <ul className="border border-gray-200 rounded-md divide-y divide-gray-200 bg-white">
                                            {attachments.map((file, index) => (
                                                <li key={index} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                                                    <div className="flex items-center flex-1 min-w-0">
                                                        <Icon name={file.type.includes('pdf') ? 'filePdf' : 'camera'} className="flex-shrink-0 h-5 w-5 text-gray-400" />
                                                        <span className="ml-2 flex-1 truncate font-medium text-gray-700">{file.name}</span>
                                                        <span className="ml-2 text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                                                    </div>
                                                    <button type="button" onClick={() => handleRemoveAttachment(file)} className="ml-4 font-medium text-red-600 hover:text-red-500 flex items-center gap-1">
                                                        <Icon name="xMark" className="h-4 w-4" /> Remover
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                    </form>
                </div>
                
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-xl">
                    <Button type="button" onClick={onClose} variant="secondary">Cancelar</Button>
                    <Button type="submit" onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? <><Icon name="arrowPath" className="h-5 w-5 animate-spin" /> Salvando...</> : <>Criar Chamado</>}
                    </Button>
                </div>
            </div>
        </div>
    );
};
