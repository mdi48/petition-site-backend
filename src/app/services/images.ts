const getImageType = async (path: string): Promise<string> => {
    const dot = path.lastIndexOf('.');
    if (dot === -1) {
        return '';
    } else {
        return path.substring(dot + 1).toLowerCase();
    }
};


export {getImageType};
