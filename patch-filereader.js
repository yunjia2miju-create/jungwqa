const originalAddEventListener = FileReader.prototype.addEventListener;
FileReader.prototype.addEventListener = function(type, listener, options) {
    if (typeof listener === 'function') {
        const wrappedListener = function(event) {
            try {
                return listener.apply(this, arguments);
            } catch (err) {
                if (err instanceof TypeError && err.message.includes("Cannot set properties of undefined (setting 'src')")) {
                    console.warn("Suppressed Pannellum FileReader race condition error.");
                } else {
                    throw err;
                }
            }
        };
        return originalAddEventListener.call(this, type, wrappedListener, options);
    }
    return originalAddEventListener.call(this, type, listener, options);
};
