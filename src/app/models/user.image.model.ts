import { get } from 'http';
import {getPool} from '../../config/db';
import Logger from '../../config/logger';
import {InvalidGivenError} from '../services/custom-errors/InvalidGivenError';
import  {NotFoundError} from '../services/custom-errors/NotFoundError';
import * as path from 'path';
import * as fs from 'fs';
import * as images from '../services/images'
import fileType from 'file-type';
import { ForbiddenError } from '../services/custom-errors/ForbiddenError';
// import multer from 'multer';

const getPhoto = async (id: number): Promise<any> => {
    const conn = await getPool().getConnection();
    try {
        const query = "SELECT image_filename FROM user WHERE id = ?";
        const [rows] = await conn.query(query, [id]);
        if (rows[0] === undefined || rows[0] === null) {
            throw new NotFoundError("User not found!"); // merge user and image not found errors
        }
        const fileName = rows[0].image_filename;
        if (fileName === null || fileName === undefined){
            throw new NotFoundError("Image not found!");
        }
        const imagesPath = path.resolve(__dirname, '../../../storage/default/');
        const filePath = path.join(imagesPath, fileName);

        const sync = fs.readFileSync(filePath);

        const typeOfImage = await images.getImageType(filePath);
        const contentType = `image/${typeOfImage === "jpg" ? "jpeg" : typeOfImage}`;
        return [sync, contentType];


    } catch (err) {
        Logger.error(err);
        throw err;
    } finally {
        await conn.release();
    }
};

const setPhoto = async (token: string, id: number, image: any, contentType : string): Promise<number> => {
    const conn = await getPool().getConnection();
    try {
        // Check if token is valid
        const userQuery = 'SELECT * FROM user WHERE auth_token = ?';
        const [users] = await conn.query(userQuery, [token]);
        if (users.length === 0) {
            throw new InvalidGivenError("Invalid token given!");
        }
        const userToken = users[0].auth_token;
        if (userToken !== token) {
            throw new ForbiddenError("User id and token do not match!");
        }

        const query = "SELECT id, image_filename FROM user WHERE id = ?";
        const [rows] = await conn.query(query, [id]);
        if (rows[0] === undefined || rows[0] === null) {
            throw new NotFoundError("User not found!");
        }
        const userId = rows[0].id;
        const currentPhoto = rows[0].image_filename;

        const storagePath = path.resolve(__dirname, '../../../storage/default/');

        let status = 200;
        if (currentPhoto === null || currentPhoto === undefined) {
            status = 201;
        }

        // Determining the type of image
        let typeOfImage : string;
        if (contentType.toLowerCase() === "image/jpg" || contentType.toLowerCase() === "image/jpeg") {
            typeOfImage = "jpeg"; // needs to be jpeg
        }
        else if (contentType.toLowerCase() === "image/png") {
            typeOfImage = "png";
        }
        else if (contentType.toLowerCase() === "image/gif") {
            typeOfImage = "gif";
        } else {
            throw new InvalidGivenError("Invalid image type given!");
        }

        const fileName = `user_${id}.${typeOfImage}`;

        // write image to storage
        const ourUploadPath = path.join(storagePath, fileName);
        fs.writeFileSync(ourUploadPath, image);

        const updateQuery = "UPDATE user SET image_filename = ? WHERE id = ?";
        const [result] = await conn.query(updateQuery, [fileName, id]);

        return status;

    } catch (err) {
        Logger.error(err);
        throw err;
    } finally {
        await conn.release();
    }
};

const deletePhoto = async (token: string, id: number): Promise<any> => {
    const conn = await getPool().getConnection();
    try {
        // Check if token is valid
        const userQuery = 'SELECT * FROM user WHERE auth_token = ?';
        const [users] = await conn.query(userQuery, [token]);
        if (users.length === 0) {
            throw new InvalidGivenError("Invalid token given!");
        }
        const userWithToken = users[0];
        if (userWithToken.id !== id) {
            throw new ForbiddenError("User id and token do not match!");
        }
        const query = "SELECT id, image_filename FROM user WHERE id = ?";
        const [rows] = await conn.query(query, [id]);
        if (rows[0] === undefined || rows[0] === null) {
            throw new NotFoundError("User not found!");
        }
        const userId = rows[0].id;
        const currentPhoto = rows[0].image_filename;

        const storagePath = path.resolve(__dirname, '../../../storage/default/');

        if (currentPhoto === null || currentPhoto === undefined) {
            throw new NotFoundError("Image not found!");
        }



        const updateQuery = "UPDATE user SET image_filename = NULL WHERE id = ?";
        const [result] = await conn.query(updateQuery, [id]);

        return;
    } catch (err) {
        Logger.error(err);
        throw err;
    } finally {
        await conn.release();
    }
};

export {getPhoto, setPhoto, deletePhoto};
