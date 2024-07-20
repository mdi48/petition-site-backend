// Made some custom errors to throw so that it becomes
// easier to handle them in the catch block

// Why am I only allowed one class per file???

class NotFoundError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = 'NotFoundError'; // for 404s
    }
}


export {NotFoundError};
