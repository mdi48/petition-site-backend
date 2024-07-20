import Logger from "../../config/logger";
import { getPool } from "../../config/db";
import * as encrypt from 'bcrypt';
import * as emails from "../services/emails";
import * as passwords from "../services/passwords";

const firstNameEdit = async (id: string, user: any, params: any) : Promise<string> => {
    // Editing the first name
    try {
        if (params.hasOwnProperty('firstName')) {
            return params.firstName;
        }
    } catch (err) {
        Logger.error(err);
    }
};

const lastNameEdit = async (id: string, user: any, params: any) : Promise<string> => {
    // Editing the last name
    try {
        if (params.hasOwnProperty('lastName')) {
            return params.lastName;
        }
    } catch (err) {
        Logger.error(err);
    }
};

const emailEdit = async (id: string, user: any, params: any) : Promise<string> => {
    // Editing the email
    try {
        if (params.hasOwnProperty('email')) {
            if (params.email == null) {
                return user.email;
            } else {
                const emailExists = await emails.checkEmailExists(params.email);
                if (emailExists) {
                    throw new Error("Email already exists");
                }
                const emailValid = await emails.validateEmail(params.email);
                if (!emailValid) {
                    throw new Error("Invalid email format");
                }
                return params.email;
            }
        }
        return user.email;
    } catch (err) {
        Logger.error(err);
    }
};

const passwordEdit = async (id: string, user: any, params: any) : Promise<any> => {
    // Editing the password
    // Maybe a little too much here. Could be simplified later.
    const conn = await getPool().getConnection();
    try {
        if (params.hasOwnProperty('password')) {
            if (!params.hasOwnProperty('currentPassword')) {
                throw new Error("Current password not provided");
            }
            const newHash = await passwords.hash(params.password);
            const fetchCurrentHash = await passwords.getHashedPassword(user.email);
            const query = 'SELECT password FROM user WHERE id = ?';
            const [rows] = await conn.query(query, [id]);
            const checkPass = await encrypt.compare(params.currentPassword, rows[0].password);
            if (!checkPass) {
                Logger.error("Current password is incorrect. Please try again.");
            }
            const arePasswordsSame = await encrypt.compare(newHash, fetchCurrentHash);
            if (arePasswordsSame) {
                Logger.error("New Password is same as current one. Please try again.");
            }
            return newHash;
        }
        return user.password;
    } catch (err) {
        Logger.error(err);
    }
};


const editUser = async (id: string, user: any, params: any) : Promise<any> => {
    // Editing the user
    try {
        return {
            firstName: await firstNameEdit(id, user, params),
            lastName: await lastNameEdit(id, user, params),
            email: await emailEdit(id, user, params),
            password: await passwordEdit(id, user, params),
        };

    } catch (err) {
        Logger.error(err);
    }
};


const changesMade = async (user: any) : Promise<any> => {
    if (user.hasOwnProperty('firstName') || user.hasOwnProperty('lastName') || user.hasOwnProperty('email') || user.hasOwnProperty('password')) {
        return true;
    }
    return false;
};



export {editUser, changesMade}
