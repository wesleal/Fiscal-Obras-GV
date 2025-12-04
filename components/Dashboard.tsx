import React from 'react';
import type { Inspection } from '../types';
import { InspectionStatus } from '../types';
import { Card } from './ui/Card';
import { Icon } from './ui/Icon';

interface DashboardProps {
    inspections: Inspection[];
    onNavigate: (view: 'list', filter?: InspectionStatus | 'all') => void;
    onSelectInspection: (id: string) => void;
}

const statusConfig = {
    [InspectionStatus.OPEN]: { icon: 'file', color: 'text-blue-500', bgColor: 'bg-blue-100' },
    [InspectionStatus.UNDER_REVIEW]: { icon: 'eye', color: 'text-purple-500', bgColor: 'bg-purple-100' },
    [InspectionStatus.IN_PROGRESS]: { icon: 'clock', color: 'text-yellow-500', bgColor: 'bg-yellow-100' },
    [InspectionStatus.PENDING_FOLLOW_UP]: { icon: 'arrowPath', color: 'text-orange-500', bgColor: 'bg-orange-100' },
    [InspectionStatus.CLOSED]: { icon: 'checkCircle', color: 'text-green-500', bgColor: 'bg-green-100' },
};

export const Dashboard: React.FC<DashboardProps> = ({ inspections, onNavigate, onSelectInspection }) => {
    const openCount = inspections.filter(i => i.status === InspectionStatus.OPEN).length;
    const underReviewCount = inspections.filter(i => i.status === InspectionStatus.UNDER_REVIEW).length;
    const pendingFollowUpCount = inspections.filter(i => i.status === InspectionStatus.PENDING_FOLLOW_UP).length;
    const inProgressCount = inspections.filter(i => i.status === InspectionStatus.IN_PROGRESS).length;
    const totalCount = inspections.length;
    
    const recentInspections = inspections.slice(0, 5);
    const highPriorityInspections = inspections.filter(i => i.status === InspectionStatus.PENDING_FOLLOW_UP || i.status === InspectionStatus.IN_PROGRESS || i.status === InspectionStatus.UNDER_REVIEW).slice(0, 5);

    const StatCard: React.FC<{ icon: string, title: string, value: number, color: string, onClick?: () => void }> = ({ icon, title, value, color, onClick }) => (
        <Card onClick={onClick} className={`p-4 flex items-center transition-all duration-200 ${onClick ? 'cursor-pointer hover:shadow-lg hover:scale-105' : ''}`}>
            <div className={`p-3 rounded-full mr-4 ${color.replace('text-', 'bg-').replace('-500', '-100')}`}>
                <Icon name={icon as any} className={`h-6 w-6 ${color}`} />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className="text-2xl font-bold">{value}</p>
            </div>
        </Card>
    );

    const InspectionListItem: React.FC<{ inspection: Inspection }> = ({ inspection }) => {
        const { icon, color } = statusConfig[inspection.status];
        return (
            <li
                key={inspection.id}
                onClick={() => onSelectInspection(inspection.id)}
                className="flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded-md cursor-pointer transition-colors"
            >
                <div className="flex items-center truncate">
                    <Icon name={icon as any} className={`h-5 w-5 mr-3 ${color}`} />
                    <div className="truncate">
                        <p className="text-sm font-medium text-brand-text truncate">{inspection.address}</p>
                        <p className="text-xs text-gray-500 truncate">{inspection.type}</p>
                    </div>
                </div>
                <p className="text-xs text-gray-400 hidden sm:block">{new Date(inspection.createdAt).toLocaleDateString()}</p>
            </li>
        )
    };

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-gray-800">Dashboard</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <StatCard icon="file" title="Abertos" value={openCount} color="text-blue-500" onClick={() => onNavigate('list', InspectionStatus.OPEN)} />
                <StatCard icon="eye" title="Em Análise" value={underReviewCount} color="text-purple-500" onClick={() => onNavigate('list', InspectionStatus.UNDER_REVIEW)} />
                <StatCard icon="clock" title="Em Andamento" value={inProgressCount} color="text-yellow-500" onClick={() => onNavigate('list', InspectionStatus.IN_PROGRESS)} />
                <StatCard icon="arrowPath" title="Pendentes" value={pendingFollowUpCount} color="text-orange-500" onClick={() => onNavigate('list', InspectionStatus.PENDING_FOLLOW_UP)} />
                <StatCard icon="archiveBox" title="Total" value={totalCount} color="text-gray-500" onClick={() => onNavigate('list', 'all')} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Chamados Recentes</h3>
                    <ul className="divide-y divide-gray-200">
                        {recentInspections.length > 0 ? (
                            recentInspections.map(inspection => <InspectionListItem key={inspection.id} inspection={inspection} />)
                        ) : (
                            <p className="text-center text-gray-500 py-4">Nenhum chamado recente.</p>
                        )}
                    </ul>
                </Card>
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Ações Prioritárias</h3>
                    <ul className="divide-y divide-gray-200">
                        {highPriorityInspections.length > 0 ? (
                            highPriorityInspections.map(inspection => <InspectionListItem key={inspection.id} inspection={inspection} />)
                        ) : (
                             <p className="text-center text-gray-500 py-4">Nenhuma ação prioritária.</p>
                        )}
                    </ul>
                </Card>
            </div>
        </div>
    );
};