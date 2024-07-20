import {Request, Response} from "express";
import Logger from '../../config/logger';
import { InvalidGivenError } from "../services/custom-errors/InvalidGivenError";
import { ForbiddenError } from "../services/custom-errors/ForbiddenError";
import * as userFuncs from '../models/user.model';
import * as emails from "../services/emails";
import { BadRequestError } from "../services/custom-errors/BadRequestError";


const register = async (req: Request, res: Response): Promise<any> => { // Completely done
    try{
        // Your code goes here
        Logger.http(`POST create a new user`);
        if (! req.body.hasOwnProperty('email') || ! req.body.hasOwnProperty('password') || ! req.body.hasOwnProperty('firstName') || ! req.body.hasOwnProperty('lastName')) {
            res.status(400).send("One or more fields are missing in the request body. Please try again.");
        }
        const email = req.body.email;
        const password = req.body.password;
        const firstName = req.body.firstName;
        const lastName = req.body.lastName;

        if (email.length > 256 || password.length > 64 || password.length < 6 || firstName.length > 64 || lastName.length > 64) {
            res.status(400).send("One or more fields are too long or your password is too short. Please try again.");
            return;
        } else if (email.length < 1 || password.length < 1 || firstName.length < 1 || lastName.length < 1) {
            res.status(400).send("One or more fields are empty. Please try again.");
            return;
        }

        const emailExists = await emails.checkEmailExists(email);
        if (emailExists) {
            res.status(403).send("Email already in use. Please try again.");
            return;
        }

        const emailValid = await emails.validateEmail(email);
        if (!emailValid) {
            res.status(400).send("Invalid email format. Please try again.");
            return;
        }


        const result = await userFuncs.insert(firstName, lastName, email, password);
        if (result) {
            res.status(201).send({userId: result.insertId}); // matches JSON syntax
            return;
        } else {
            res.status(400).send("User already exists");
            return;
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
};

const login = async (req: Request, res: Response): Promise<any> => { // I think we can only have one user logged in at a time. F*ck.
    // More cases to consider: Case where user is already logged in,
    try{
        // Your code goes here
        if (!req.body.email || !req.body.password) {
            res.status(400).send("One or more fields are missing.");
            return;
        }
        if (req.body.email === "" || req.body.password === "") {
            res.status(400).send("One or more fields are empty.");
            return;
        }

        const emailValid = await emails.validateEmail(req.body.email); // making sure that email is valid
        if (!emailValid) {
            res.status(400).send("Invalid email format. Please try again.");
            return;
        }

        const loginAttempt = await userFuncs.loggingIn(req.body.email, req.body.password);
        if (loginAttempt.userId && loginAttempt.token) {
            res.status(200).send(loginAttempt); // need to return the user id});
            return;
        } else {
            res.status(401).send("Invalid email or password.");
            return;
        }
    } catch (err) {
        if (err instanceof BadRequestError) {
            res.status(404).send();
            return;
        }
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
};

const logout = async (req: Request, res: Response): Promise<void> => { // Needs to log out currently authenticated user
    try{
        // Your code goes here
        const token = req.header('X-Authorization');
        if (!token) {
            throw new BadRequestError("Token not provided");// 401 if no token provided, 403 if token is invalid
        }
        const logoutAttempt = await userFuncs.loggingOut(token);
        if (logoutAttempt) {
            res.status(200).send("OK");
            return;
        } else {
            res.status(401).send("Unauthorized");
            return;
        }
    } catch (err) {
        if (err instanceof BadRequestError) {
            res.status(401).send(err.message);
            return;
        }
        if (err instanceof ForbiddenError) {
            res.status(403).send(err.message);
            return;
        }
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
};

const view = async (req: Request, res: Response): Promise<void> => { // All done I think
    try{
        // Your code goes here
        if (!Number(req.params.id) || !(Number.isInteger(Number(req.params.id)))) {
            res.status(400).send("id must be an integer. Please try again.");
            return;
        }

        const token = req.header('X-Authorization'); // no need to check if not there because it's not a necessity
        const userId = req.params.id;
        const result = await userFuncs.getUser(userId, token);
        res.status(200).send(result);
    } catch (err) {
        if (err instanceof InvalidGivenError) {
            res.status(400).send(err.message);
            return;
        }
        if (err instanceof BadRequestError) {
            res.status(404).send(err.message);
            return;
        }
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
};

const update = async (req: Request, res: Response): Promise<void> => { // finally got it done :)
    try{
        // Your code goes here

        // Make sure that the id is valid
        if (isNaN(Number(req.params.id)) || !(Number.isInteger(Number(req.params.id)))) {
            throw new InvalidGivenError("Invalid id given!");
        }

        const token = req.header('X-Authorization');
        if (!token) {
            res.status(401).send("Unauthorized");
            return;
        }
        const userId = Number(req.params.id); // id and token are not editable

        const response = await userFuncs.updateUser(userId, token, req.body); // third param is for stuff you want to update

        if (response) {
            res.status(200).send();
            return;
        } else {
            res.status(404).send();
            return;
        }

    } catch (err) {
        if (err instanceof BadRequestError) {
            res.status(404).send(err.message);
            return;
        }
        if (err instanceof ForbiddenError) {
            res.status(403).send(err.message);
            return;
        }
        else if (err instanceof InvalidGivenError) {
            res.status(400).send(err.message);
            return;
        }
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
};

export {register, login, logout, view, update}
