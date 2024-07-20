class InvalidGivenError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = 'InvalidGivenError'; // for 401s
    }
}


export {InvalidGivenError};
