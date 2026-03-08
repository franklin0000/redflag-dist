
import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';

export default function Layout() {
    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-gray-800 dark:text-gray-100 antialiased min-h-screen flex flex-col max-w-md mx-auto relative shadow-2xl border-x border-gray-200 dark:border-white/5">
            <Header />
            <main className="flex-1 overflow-y-auto pb-24 animate-page-in">
                <Outlet />
            </main>
        </div>
    );
}
