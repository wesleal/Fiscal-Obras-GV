
import React, { useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import type { User } from '../types';
import { UserRole } from '../types';
import { Card } from './ui/Card';
import { Icon } from './ui/Icon';
import { Button } from './ui/Button';

interface UserManagementProps {
    onBack: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ onBack }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        const userList = await authService.getUsers();
        setUsers(userList);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);
    
    const handleAddUser = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleSaveUser = async () => {
        await fetchUsers();
        setIsModalOpen(false);
    };
    
    const handleDeleteUser = async (userId: string) => {
        if(window.confirm("Tem certeza que deseja remover este usuário?")) {
            await authService.deleteUser(userId);
            await fetchUsers();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-brand-blue">
                    <Icon name="arrowLeft" className="h-5 w-5" /> Voltar para o Dashboard
                </button>
                 <Button onClick={handleAddUser}>
                    <Icon name="plusCircle" className="h-5 w-5" /> Adicionar Usuário
                </Button>
            </div>
            <Card>
                <div className="p-4 sm:p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold">Gerenciamento de Usuários</h2>
                </div>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Função</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                         <tbody className="bg-white divide-y divide-gray-200">
                             {isLoading ? (
                                <tr><td colSpan={4} className="text-center p-8">Carregando usuários...</td></tr>
                             ) : users.map(user => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.username}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => handleEditUser(user)} className="text-brand-blue hover:text-brand-blue-dark">Editar</button>
                                        <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-800">Remover</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            {isModalOpen && (
                <UserFormModal 
                    user={editingUser}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveUser}
                />
            )}
        </div>
    );
};


interface UserFormModalProps {
    user: User | null;
    onClose: () => void;
    onSave: () => void;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ user, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: user?.name || '',
        username: user?.username || '',
        password: '',
        role: user?.role || UserRole.INSPECTOR,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!user && !formData.password) {
            setError("A senha é obrigatória para novos usuários.");
            return;
        }
        setIsSaving(true);
        setError('');
        try {
            if (user) {
                await authService.updateUser(user.id, formData);
            } else {
                await authService.addUser({ ...formData, password: formData.password });
            }
            onSave();
        } catch (err: any) {
            setError(err.message || "Ocorreu um erro.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const inputClasses = "w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue-light";

    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <form onSubmit={handleSubmit}>
                    <div className="flex justify-between items-center p-4 border-b">
                        <h2 className="text-xl font-bold">{user ? "Editar Usuário" : "Adicionar Novo Usuário"}</h2>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <Icon name="xMark" className="h-6 w-6" />
                        </button>
                    </div>
                     <div className="p-6 space-y-4">
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClasses} required />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Nome de Usuário</label>
                            <input type="text" name="username" value={formData.username} onChange={handleChange} className={inputClasses} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Senha</label>
                            <input type="password" name="password" value={formData.password} onChange={handleChange} className={inputClasses} placeholder={user ? "Deixe em branco para não alterar" : ""} required={!user} />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Função</label>
                            <select name="role" value={formData.role} onChange={handleChange} className={inputClasses}>
                                {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                        <Button type="button" onClick={onClose} variant="secondary">Cancelar</Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? "Salvando..." : "Salvar"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
