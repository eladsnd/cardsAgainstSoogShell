/**
 * Socket Client Wrapper
 * Handles all socket.io communication
 */

class SocketClient {
    constructor() {
        this.socket = io();
        this.callbacks = new Map();

        this.initializeListeners();
    }

    initializeListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.trigger('connect');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.trigger('disconnect');
        });

        // Generic event handler
        this.socket.onAny((eventName, ...args) => {
            if (this.callbacks.has(eventName)) {
                this.callbacks.get(eventName).forEach(cb => cb(...args));
            }
        });
    }

    on(event, callback) {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }
        this.callbacks.get(event).push(callback);
    }

    emit(event, ...args) {
        this.socket.emit(event, ...args);
    }

    getId() {
        return this.socket.id;
    }

    trigger(event, ...args) {
        if (this.callbacks.has(event)) {
            this.callbacks.get(event).forEach(cb => cb(...args));
        }
    }
}

export { SocketClient };
