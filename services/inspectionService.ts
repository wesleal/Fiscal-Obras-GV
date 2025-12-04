
import type { Inspection, Photo, FollowUp, Attachment, HistoryEntry, User } from '../types';
import { InspectionStatus, InspectionSource, InspectionType } from '../types';
import { mockInspections } from './mockData';

let inspections: Inspection[] = [...mockInspections];
const LATENCY = 500;

// Helper to get current user from localStorage
const getCurrentUser = (): User | null => {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
};


const inspectionService = {
  getInspections: (): Promise<Inspection[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(JSON.parse(JSON.stringify(inspections.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))));
      }, LATENCY);
    });
  },

  getInspectionById: (id: string): Promise<Inspection | undefined> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const inspection = inspections.find((insp) => insp.id === id);
        resolve(inspection ? JSON.parse(JSON.stringify(inspection)) : undefined);
      }, LATENCY);
    });
  },

  createInspection: (data: Partial<Omit<Inspection, 'id' | 'protocol' | 'createdAt' | 'updatedAt' | 'photos' | 'followUps' | 'status' | 'actions' | 'verifiedInfractions' | 'history'>>, currentUser: User): Promise<Inspection> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const now = new Date().toISOString();
        const newInspection: Inspection = {
          address: data.address || '',
          source: data.source || InspectionSource.INTERNAL,
          type: data.type || InspectionType.OTHER,
          description: data.description || '',
          status: data.inspector ? InspectionStatus.UNDER_REVIEW : InspectionStatus.OPEN,
          createdAt: now,
          updatedAt: now,
          id: String(Date.now()),
          protocol: `2024-${String(inspections.length + 1).padStart(3, '0')}`,
          photos: [],
          followUps: [],
          actions: [],
          verifiedInfractions: {},
          history: [
            {
              timestamp: now,
              user: currentUser.name,
              change: data.inspector ? `Chamado criado e atribuído para ${data.inspector}.` : 'Chamado criado.'
            }
          ],
          attachments: data.attachments || [],
          complainantName: data.complainantName,
          complainantAddress: data.complainantAddress,
          respondentName: data.respondentName,
          contactPhone: data.contactPhone,
          inspector: data.inspector,
          referencePoint: data.referencePoint,
          complaintDate: data.complaintDate,
        };
        inspections = [newInspection, ...inspections];
        resolve(JSON.parse(JSON.stringify(newInspection)));
      }, LATENCY);
    });
  },

  updateInspection: (id: string, data: Partial<Inspection>): Promise<Inspection | undefined> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = inspections.findIndex((insp) => insp.id === id);
        if (index !== -1) {
          const original = inspections[index];
          const newHistory: HistoryEntry[] = [];
          const now = new Date().toISOString();
          const user = getCurrentUser()?.name || 'Sistema';

          if (data.status && data.status !== original.status) {
              newHistory.push({ timestamp: now, user, change: `Status alterado de "${original.status}" para "${data.status}".` });
          }
          if (data.inspector && data.inspector !== original.inspector) {
              newHistory.push({ timestamp: now, user, change: `Fiscal ${data.inspector} foi atribuído.` });
          }
          if (data.report && data.report !== original.report) {
              newHistory.push({ timestamp: now, user, change: 'Relatório da constatação foi atualizado.' });
          }
          if (data.actions && JSON.stringify(data.actions.sort()) !== JSON.stringify(original.actions.sort())) {
              newHistory.push({ timestamp: now, user, change: 'Ações da fiscalização foram atualizadas.' });
          }
          if (data.verifiedInfractions && JSON.stringify(data.verifiedInfractions) !== JSON.stringify(original.verifiedInfractions)) {
              newHistory.push({ timestamp: now, user, change: 'Tipos de infração verificada foram atualizados.' });
          }

          inspections[index] = { 
            ...original, 
            ...data, 
            updatedAt: now,
            history: [...newHistory, ...original.history].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          };

          resolve(JSON.parse(JSON.stringify(inspections[index])));
        } else {
          resolve(undefined);
        }
      }, LATENCY);
    });
  },

  addPhoto: (inspectionId: string, photoData: { url: string; name: string }): Promise<Photo> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = inspections.findIndex((insp) => insp.id === inspectionId);
        if (index !== -1) {
          const now = new Date().toISOString();
          const user = getCurrentUser()?.name || 'Sistema';
          const newPhoto: Photo = {
            id: String(Date.now()),
            uploadedAt: now,
            ...photoData,
          };
          inspections[index].photos.push(newPhoto);
          inspections[index].updatedAt = now;
          inspections[index].history.unshift({
              timestamp: now,
              user: user,
              change: `Nova foto adicionada: ${photoData.name}.`
          });

          resolve(newPhoto);
        } else {
          reject(new Error('Inspection not found'));
        }
      }, LATENCY);
    });
  },
  
  addFollowUp: (inspectionId: string, followUpData: { date: string; notes: string }): Promise<FollowUp> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = inspections.findIndex((insp) => insp.id === inspectionId);
        if (index !== -1) {
          const now = new Date().toISOString();
          const user = getCurrentUser()?.name || 'Sistema';
          const newFollowUp: FollowUp = {
            id: String(Date.now()),
            completed: false,
            ...followUpData,
          };
          inspections[index].followUps.push(newFollowUp);
          
          const newHistory: HistoryEntry[] = [];

          if (inspections[index].status !== InspectionStatus.PENDING_FOLLOW_UP) {
            newHistory.push({
              timestamp: now,
              user,
              change: `Status alterado para "${InspectionStatus.PENDING_FOLLOW_UP}".`
            });
            inspections[index].status = InspectionStatus.PENDING_FOLLOW_UP;
          }

          newHistory.push({
            timestamp: now,
            user,
            change: `Agendamento de retorno criado para ${new Date(followUpData.date + 'T00:00:00').toLocaleDateString()}.`
          });
          
          inspections[index].history = [...newHistory, ...inspections[index].history];
          inspections[index].updatedAt = now;

          resolve(newFollowUp);
        } else {
          reject(new Error('Inspection not found'));
        }
      }, LATENCY);
    });
  },

};

export { inspectionService };
