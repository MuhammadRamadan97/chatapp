import React from 'react';
import Message from './Message';

export default function MessageList({ messages }) {
    return (
        <div className="mt-4">
            {messages.map((msg, index) => (
                <Message key={index} message={msg} />
            ))}
        </div>
    );
}