import {getPool} from '../../config/db';
import Logger from '../../config/logger';
import {InvalidGivenError} from '../services/custom-errors/InvalidGivenError';
import  {NotFoundError} from '../services/custom-errors/NotFoundError';
import * as path from 'path';
import * as fs from 'fs';
import * as images from '../services/images'
import fileType from 'file-type';
import { type } from 'os';
import { ForbiddenError } from '../services/custom-errors/ForbiddenError';

const getPhoto = async (id: number): Promise<any> => {
    const conn = await getPool().getConnection();
    try {
        const query = "SELECT image_filename FROM petition WHERE id = ?";
        const [rows] = await conn.query(query, [id]);
        if (rows[0] === undefined || rows[0] === null) {
            throw new NotFoundError("Petition not found!");
        }

        const fileName = rows[0].image_filename;
        if (fileName === null || fileName === undefined){
            throw new NotFoundError("Image not found!");
        }
        const imagesPath = path.resolve(__dirname, '../../../storage/default/');
        const filePath = path.join(imagesPath, fileName);

        const sync = fs.readFileSync(filePath);

        let typeOfImage = await images.getImageType(filePath);
        let contentType = 'image/'; // need to add the type of image to it later so cant be a const
        if (typeOfImage === "jpg") {
            typeOfImage = "jpeg"; // needs to be jpeg
        }
        contentType += typeOfImage;
        return [sync, contentType];


    } catch (err) {
        Logger.error(err);
        throw err;
    } finally {
        await conn.release();
    }
};

const setPhoto = async (token: string, id: number, image: Buffer, contentType: string): Promise<number> => {
    const conn = await getPool().getConnection();
    try {
        // Check if token is valid
        const userQuery = 'SELECT * FROM user WHERE auth_token = ?';
        const [users] = await conn.query(userQuery, [token]);
        if (users.length === 0) {
            throw new InvalidGivenError("Invalid token given!");
        }
        const userId = users[0].id;

        const query = "SELECT id, owner_id, image_filename FROM petition WHERE id = ?";
        const [rows] = await conn.query(query, [id]);
        if (rows[0] === undefined || rows[0] === null) {
            throw new NotFoundError("Petition not found!");
        }

        const ownerId = rows[0].owner_id;
        const currentPhoto = rows[0].image_filename;

        if (userId !== ownerId) {
            throw new ForbiddenError("You are not the owner of this petition!");
        }

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

        const fileName = `petition_${id}.${typeOfImage}`;

        // write image to storage
        const ourUploadPath = path.join(storagePath, fileName);
        fs.writeFileSync(ourUploadPath, image);

        const updateQuery = "UPDATE petition SET image_filename = ? WHERE id = ?";
        const [result] = await conn.query(updateQuery, [fileName, id]);

        return status;




    } catch (err) {
        Logger.error(err);
        throw err;
    } finally {
        await conn.release();
    }
};

export {getPhoto, setPhoto};
