
export enum InspectionStatus {
    OPEN = 'Aberto',
    UNDER_REVIEW = 'Em Análise',
    IN_PROGRESS = 'Em Andamento',
    PENDING_FOLLOW_UP = 'Pendente de Retorno',
    CLOSED = 'Concluído',
}

export enum InspectionSource {
    INTERNAL = 'Gerência',
    CITIZEN_IN_PERSON = 'Contribuinte (Presencial)',
    CITIZEN_WHATSAPP = 'Contribuinte (WhatsApp)',
    CITIZEN_EMAIL = 'Contribuinte (Email)',
    PUBLIC_MINISTRY = 'Ministério Público',
    OMBUDSMAN = 'Ouvidoria Municipal',
    CIVIL_DEFENSE = 'Defesa Civil',
    OTHER_DEPARTMENTS = 'Outras Secretarias',
}

export enum InspectionType {
    CONSTRUCTION_PERMIT = 'Alvará de Construção',
    APPROVED_PROJECT = 'Projeto Aprovado',
    OCCUPANCY_PERMIT = 'Habite-se / Ocupação',
    BUSINESS_PERMIT = 'Alvará de Funcionamento',
    LAND_PARCELLING = 'Parcelamento do Solo',
    WORK_IN_DISAGREEMENT_WITH_APPROVED_PROJECT = 'Obra em desacordo com projeto aprovado',
    DEMOLITION_WITHOUT_PERMIT = 'Demolição sem alvará de licença',
    EARTHMOVING_WITHOUT_PERMIT = 'Movimentação de terra sem alvará de licença',
    ELEVATORS = 'Elevadores',
    OPENING_ON_BOUNDARY = 'Abertura na divisa',
    SIDEWALK_ACCESSIBILITY = 'Acessibilidade em calçadas',
    INFILTRATION = 'Infiltração',
    ACOUSTIC_INSULATION = 'Isolamento acústico',
    MARQUEES_AND_ROOFS = 'Marquise e coberturas',
    MATERIALS_ON_STREET = 'Material e massa na rua',
    BOUNDARY_WALL = 'Muro de vedação',
    PROPERTY_MAINTENANCE = 'Zelar pelas boas condições do imóvel',
    OTHER = 'Outro',
}

export enum InspectionAction {
    ORIENTED = 'Contribuinte Orientado',
    NOTIFICATION = 'Notificação',
    FINE = 'Autuação',
    SEIZURE = 'Apreensão',
    EMBARGO = 'Embargo',
    INTERDICTION = 'Interdição',
    DEMOLITION = 'Demolição',
}

export enum UserRole {
    ADMIN = 'Administrador',
    INSPECTOR = 'Fiscal',
}

export interface User {
    id: string;
    name: string;
    username: string;
    role: UserRole;
}

export interface Photo {
    id: string;
    url: string; // data URL
    name: string;
    uploadedAt: string;
}

export interface FollowUp {
    id: string;
    date: string;
    notes: string;
    completed: boolean;
}

export interface Attachment {
    name: string;
    type: string;
    data: string; // base64 encoded data URL
}

export interface HistoryEntry {
    timestamp: string;
    user: string;
    change: string;
}

export interface Inspection {
    id: string;
    protocol: string;
    address: string;
    latitude?: number;
    longitude?: number;
    source: InspectionSource;
    type: InspectionType;
    description: string;
    status: InspectionStatus;
    createdAt: string;
    updatedAt: string;
    inspector?: string;
    report?: string;
    reportSummary?: string;
    photos: Photo[];
    followUps: FollowUp[];
    actions: InspectionAction[];
    verifiedInfractions: Partial<Record<InspectionType, boolean>>;
    complainantName?: string;
    complainantAddress?: string;
    respondentName?: string;
    contactPhone?: string;
    attachments: Attachment[];
    referencePoint?: string;
    complaintDate?: string;
    history: HistoryEntry[];
}
