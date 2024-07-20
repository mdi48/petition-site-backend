import {Request, Response} from "express";
import Logger from "../../config/logger";
import { NotFoundError } from "../services/custom-errors/NotFoundError";
import { InvalidGivenError } from "../services/custom-errors/InvalidGivenError";
import { ForbiddenError } from "../services/custom-errors/ForbiddenError";
import * as petitionImageFuncs from '../models/petition.image.model';


const getImage = async (req: Request, res: Response): Promise<void> => {
    try{
        // Your code goes here
        const id = Number(req.params.id);
        if (isNaN(id) || !Number.isInteger(id)) {
            res.status(400).send("Invalid id parameter. Please make sure it is an integer.");
            return;
        }
        const [sync, contentType] = await petitionImageFuncs.getPhoto(id);
        res.contentType(contentType);
        res.status(200).send(sync);
        return;
    } catch (err) {
        if (err instanceof NotFoundError) {
            res.status(404).send(err.message);
            return;
        } else {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
        }
    }
};

const setImage = async (req: Request, res: Response): Promise<void> => {
    try{
        // Your code goes here
        const token = req.header('X-Authorization');
        if (token === undefined) {
            res.status(401).send();
            return;
        }
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).send();
            return;
        }
        const image : Buffer = req.body;
        const contentType = req.header('Content-Type');
        const result = await petitionImageFuncs.setPhoto(token, id, image, contentType);
        res.status(result).send();

    } catch (err) {
        if (err instanceof NotFoundError) {
            res.status(404).send(err.message); // throw if petition is not found
        }
        if (err instanceof InvalidGivenError) {
            res.status(400).send(err.message);
        }
        if (err instanceof ForbiddenError) {
            res.status(403).send(err.message); // throw is user not allowed to edit image
        }
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}


export {getImage, setImage};
