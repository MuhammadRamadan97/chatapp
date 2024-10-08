'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { UserContext } from '@/app/context';
import { unstable_noStore as noStore } from 'next/cache';

export default function ChatContainer() {
    noStore();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user, selectedUser } = useContext(UserContext);
    const messagesEndRef = useRef(null);
    const socket = useRef(null);

    useEffect(() => {
        // Initialize socket connection
        socket.current = io('https://chatapp-1-5zsg.onrender.com');

        // Request notification permission
        if (Notification.permission !== 'granted') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('Notification permission granted');
                } else {
                    console.log('Notification permission denied');
                }
            }).catch(error => {
                console.error('Error requesting notification permission:', error);
            });
        }

        const fetchMessages = () => {
            socket.current.emit('request messages', { userId: user.id, selectedUserId: selectedUser });
        };

        if (socket.current && user.id && selectedUser) {
            fetchMessages();
        }

        const handleMessages = (fetchedMessages) => {
            setMessages(JSON.parse(fetchedMessages));
            console.log('Fetched messages:', JSON.parse(fetchedMessages));
            setLoading(false);
            scrollToBottom();
        };

        socket.current.on('response messages', handleMessages);

        // Clean up the effect by removing the listener
        return () => {
            if (socket.current) {
                socket.current.off('response messages', handleMessages);
                socket.current.disconnect(); // Disconnect socket when component unmounts
            }
        };
    }, [user.id, selectedUser]);

    useEffect(() => {
        const handleNewMessage = (msg) => {
            setMessages((prevMessages) => [...prevMessages, msg]);
            scrollToBottom();

            // Send notification if window is not active
            if (document.hidden && Notification.permission === 'granted' && msg.sender !== user.id) {
                const notification = new Notification(`New message from ${msg.sender}`, {
                    body: msg.text,
                });

                notification.onclick = () => {
                    window.focus();
                    notification.close();
                };
            }
        };

        if (socket.current) {
            socket.current.on('chat message', handleNewMessage);
        }

        // Clean up the effect by removing the listener
        return () => {
            if (socket.current) {
                socket.current.off('chat message', handleNewMessage);
            }
        };
    }, [selectedUser, user.id]);

    const sendMessage = (text) => {
        if (text.trim() === '') return;

        const newMsg = {
            text,
            sender: user.id,
            receiver: selectedUser,
            time: new Date().toISOString(),
        };

        // Emit the message to the server
        if (socket.current) {
            socket.current.emit('chat message', newMsg);
        }
        setMessages((prevMessages) => [...prevMessages, newMsg]);

        scrollToBottom();
    };

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const filteredMessages = messages.filter(
        (msg) =>
            (msg.sender === user.id && msg.receiver === selectedUser) ||
            (msg.sender === selectedUser && msg.receiver === user.id)
    );

    useEffect(() => {
        scrollToBottom();
    }, [filteredMessages]);

    return (
        <div className="flex flex-col h-full">
            {!selectedUser && <h3>Choose a user to begin chatting</h3>}
            {loading ? (
                <div>Loading messages...</div>
            ) : (
                <>
                    <div className="flex-grow overflow-y-auto">
                        <MessageList messages={filteredMessages} />
                        <div ref={messagesEndRef} />
                    </div>

                    {selectedUser && <MessageInput onSendMessage={sendMessage} />}
                </>
            )}
        </div>
    );
}
