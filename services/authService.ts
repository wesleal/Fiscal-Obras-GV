
import type { User } from '../types';
import { UserRole } from '../types';

// Mock database of users
let users: (User & { passwordHash: string })[] = [
    { id: '1', name: 'Admin Geral', username: 'admin', passwordHash: 'admin123', role: UserRole.ADMIN },
    { id: '2', name: 'João Silva', username: 'fiscal', passwordHash: 'fiscal123', role: UserRole.INSPECTOR },
    { id: '3', name: 'Maria Oliveira', username: 'maria.o', passwordHash: 'senha456', role: UserRole.INSPECTOR },
];

const LATENCY = 500;

const authService = {
    login: (username: string, password_not_hashed: string): Promise<User | null> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const user = users.find(u => u.username === username && u.passwordHash === password_not_hashed);
                if (user) {
                    const { passwordHash, ...userToStore } = user;
                    localStorage.setItem('currentUser', JSON.stringify(userToStore));
                    resolve(userToStore);
                } else {
                    resolve(null);
                }
            }, LATENCY);
        });
    },

    logout: (): void => {
        localStorage.removeItem('currentUser');
    },

    getCurrentUser: (): User | null => {
        const userJson = localStorage.getItem('currentUser');
        return userJson ? JSON.parse(userJson) : null;
    },
    
    getUsers: (): Promise<User[]> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(users.map(({ passwordHash, ...user }) => user));
            }, LATENCY);
        });
    },
    
    addUser: (userData: Omit<User, 'id'> & {password: string}): Promise<User> => {
         return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (users.some(u => u.username === userData.username)) {
                    reject(new Error("Nome de usuário já existe."));
                    return;
                }
                const newUser: User & { passwordHash: string } = {
                    id: String(Date.now()),
                    name: userData.name,
                    username: userData.username,
                    role: userData.role,
                    passwordHash: userData.password,
                };
                users.push(newUser);
                const { passwordHash, ...userToReturn } = newUser;
                resolve(userToReturn);
            }, LATENCY);
        });
    },

    updateUser: (userId: string, data: Partial<User>): Promise<User> => {
         return new Promise((resolve, reject) => {
            setTimeout(() => {
                const index = users.findIndex(u => u.id === userId);
                if (index === -1) {
                    reject(new Error("Usuário não encontrado."));
                    return;
                }
                users[index] = { ...users[index], ...data };
                const { passwordHash, ...userToReturn } = users[index];
                resolve(userToReturn);
            }, LATENCY);
        });
    },
    
    deleteUser: (userId: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const initialLength = users.length;
                users = users.filter(u => u.id !== userId);
                if (users.length === initialLength) {
                    reject(new Error("Usuário não encontrado."));
                } else {
                    resolve();
                }
            }, LATENCY);
        });
    }
};

export { authService };
