
import React from 'react';

const ChatAttachment = ({ type, url, fileName }) => {
    if (!url) return null;

    switch (type) {
        case 'image':
            return (
                <div className="relative group cursor-pointer overflow-hidden rounded-lg max-w-xs">
                    <img
                        src={url}
                        alt="Attachment"
                        className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onClick={() => window.open(url, '_blank')}
                    />
                </div>
            );
        case 'video':
            return (
                <div className="max-w-xs rounded-lg overflow-hidden bg-black">
                    <video
                        src={url}
                        controls
                        className="w-full h-auto"
                        preload="metadata"
                    />
                </div>
            );
        case 'audio':
            return (
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-full max-w-xs">
                    <audio
                        src={url}
                        controls
                        className="w-full h-8"
                    />
                </div>
            );
        case 'document':
        case 'file':
            return (
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors max-w-xs border border-gray-200 dark:border-gray-700"
                >
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                        <span className="material-icons">description</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {fileName || 'Document'}
                        </p>
                        <p className="text-xs text-gray-500 uppercase">Download</p>
                    </div>
                    <span className="material-icons text-gray-400">download</span>
                </a>
            );
        default:
            return null;
    }
};

export default ChatAttachment;
