
import React, { useState } from 'react';
import { authService } from '../services/authService';
import type { User } from '../types';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';

interface LoginProps {
    onLoginSuccess: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const user = await authService.login(username, password);
            if (user) {
                onLoginSuccess(user);
            } else {
                setError('Usuário ou senha inválidos.');
            }
        } catch (err) {
            setError('Ocorreu um erro. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-gray">
            <div className="w-full max-w-md">
                <form onSubmit={handleSubmit} className="bg-white shadow-2xl rounded-xl px-8 pt-10 pb-8 mb-4">
                    <div className="mb-8 text-center">
                         <Icon name="shieldCheck" className="mx-auto h-16 w-16 text-brand-blue" />
                        <h1 className="text-2xl font-bold text-gray-800 mt-4">Fiscal Obras GV</h1>
                        <p className="text-gray-500">Acesso Restrito</p>
                    </div>
                    
                    {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm text-center">{error}</p>}

                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                            Usuário
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="shadow-sm appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-brand-blue-light"
                            placeholder="Digite seu usuário"
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                            Senha
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="shadow-sm appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-brand-blue-light"
                            placeholder="************"
                            required
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                             {isLoading ? <><Icon name="arrowPath" className="h-5 w-5 animate-spin" /> Entrando...</> : 'Entrar'}
                        </Button>
                    </div>
                </form>
                <p className="text-center text-gray-500 text-xs">
                    &copy;{new Date().getFullYear()} Gerência de Fiscalização de Obras.
                </p>
            </div>
        </div>
    );
};
