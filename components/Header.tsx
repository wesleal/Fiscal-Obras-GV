
import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './ui/Icon';
import type { User } from '../types';
import { UserRole } from '../types';

interface HeaderProps {
    user: User;
    onNavigate: (view: 'dashboard' | 'list' | 'userManagement') => void;
    onNewInspection: () => void;
    onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onNavigate, onNewInspection, onLogout }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="bg-brand-blue shadow-md sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 gap-4">
                    <div className="flex items-center min-w-0">
                        <div className="flex-shrink-0">
                             <h1 onClick={() => onNavigate('dashboard')} className="text-white text-2xl font-bold cursor-pointer flex items-center gap-2 truncate">
                                <Icon name="shieldCheck" className="h-8 w-8" />
                                <span className="truncate">Fiscal Obras GV</span>
                            </h1>
                        </div>
                        <nav className="hidden md:block ml-10">
                            <div className="flex items-baseline space-x-4">
                                <button onClick={() => onNavigate('dashboard')} className="text-gray-300 hover:bg-brand-blue-light hover:text-white px-3 py-2 rounded-md text-sm font-medium">Dashboard</button>
                                <button onClick={() => onNavigate('list')} className="text-gray-300 hover:bg-brand-blue-light hover:text-white px-3 py-2 rounded-md text-sm font-medium">Chamados</button>
                            </div>
                        </nav>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onNewInspection}
                            className="inline-flex items-center gap-2 bg-white text-brand-blue hover:bg-gray-200 font-bold py-2 px-4 rounded-md shadow-sm transition-colors duration-200"
                        >
                            <Icon name="plusCircle" className="h-6 w-6" />
                            <span className="hidden sm:inline">Novo Chamado</span>
                            <span className="sm:hidden">Novo</span>
                        </button>
                        <div className="relative" ref={menuRef}>
                            <button onClick={() => setIsMenuOpen(prev => !prev)} className="flex items-center gap-2 text-white p-2 rounded-full hover:bg-brand-blue-light">
                                <span className="font-semibold hidden sm:inline">{user.name}</span>
                                <Icon name="user" className="h-6 w-6 bg-white text-brand-blue rounded-full p-0.5" />
                            </button>
                            {isMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 border">
                                    <ul className="py-1">
                                        {user.role === UserRole.ADMIN && (
                                             <li>
                                                <button
                                                    onClick={() => { onNavigate('userManagement'); setIsMenuOpen(false); }}
                                                    className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                >
                                                    <Icon name="users" className="h-5 w-5" />
                                                    Gerenciar Usuários
                                                </button>
                                            </li>
                                        )}
                                        <li>
                                            <button
                                                onClick={onLogout}
                                                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                            >
                                                <Icon name="arrowLeft" className="h-5 w-5" />
                                                Sair
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};
