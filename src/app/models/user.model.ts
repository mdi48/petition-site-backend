import { getPool} from "../../config/db";
import * as passwords from "../services/passwords";
import * as emails from "../services/emails";
import Logger from "../../config/logger";
import { InvalidGivenError } from "../services/custom-errors/InvalidGivenError";
import * as encrypt from 'bcrypt';
import { ForbiddenError } from "../services/custom-errors/ForbiddenError";
import { BadRequestError } from "../services/custom-errors/BadRequestError";




const generateAuthToken = async (userId: string) : Promise<any> => {
    const salt = await encrypt.genSalt(10);
    const token = await encrypt.hash(userId.toString(), salt);
    return token;
};


const insert = async (firstName: string, lastName: string, email: string, password: string) : Promise<any> => {
    // Creates a new User to be registered
    const conn = await getPool().getConnection();
    try {
        const hashPassword = await passwords.hash(password); // update the hash function in passwords.ts
        const query = "INSERT INTO user (first_name, last_name, email, password) VALUES (?)"; // needs to strictly match the query field names
        const values = [[firstName, lastName, email, hashPassword]];
        const [result] = await conn.query(query, values);
        return result;
        // auto checks if user exists so no need for tests
    } catch (err) {
        Logger.error(err);
    } finally {
        await conn.release();
    }
};

const loggingIn = async (email : string, password : string) : Promise<any> => {
    const conn = await getPool().getConnection();
    try {

        const doesEmailExist = await emails.checkEmailExists(email); // checking if the email is in the database
        if (!doesEmailExist) {
            return {userId: null, authToken: null};
        }
        const hashedPassword = await passwords.getHashedPassword(email);
        const arePasswordsSame = await encrypt.compare(password, hashedPassword);
        if (!arePasswordsSame) {
            return {userId: null, authToken: null};
        }
        // Now need to fetch userId from the database
        const query = "SELECT id FROM user WHERE email = ?";
        const [rows] = await conn.query( query, [ email ]);
        const userId : string = rows[0].id;
        if (userId === null) {
            return {userId: null, authToken: null};
        }
        const token = await generateAuthToken(userId);
        const updateToken = "UPDATE user SET auth_token = ? WHERE id = ?";
        const values = [token, userId];
        const [result] = await conn.query(updateToken, values);

        // have to return in a hyper-specific way where token is first and a string and userId is second and a number
        return {token: token.toString(), userId: Number(userId)};
    } catch (err) {
        Logger.error(err);
    } finally {
        await conn.release();
    }
};

const loggingOut = async (token : string) : Promise<any> => {
    if (token === null) {
        throw new BadRequestError("No token provided"); // 401 since null token is not allowed thus no authorization
    }
    const conn = await getPool().getConnection();
    try {
        const findId = "SELECT id FROM user WHERE auth_token = ?";
        const [rows] = await conn.query( findId, [ token ]);
        if (rows[0] === undefined) {
            throw new ForbiddenError("Token is invalid."); // 403 since token is invalid thus cannot be authorized
        }
        const query = "UPDATE user SET auth_token = NULL WHERE auth_token = ?";
        const [result] = await conn.query( query, [ token ]);
        return result;
    } catch (err) {
        Logger.error(err);
    } finally {
        await conn.release();
    }
};

const getUser = async (id : string, token: string) : Promise<any> => {
    // Get a user from the database
    const conn = await getPool().getConnection();

    try {
        const query = "SELECT first_name, last_name, email, auth_token FROM user WHERE id = ?";
        const [rows] = await conn.query( query, [ id ]);
        if (rows[0] === undefined) {
            throw new BadRequestError("User does not exist.");
        }


        // checks if token is not null and is same as token we gave as param, which means user is logged in, so it adds the email to result
        if (rows[0].auth_token !== null && rows[0].auth_token === token) {
            return {
                firstName: rows[0].first_name,
                lastName: rows[0].last_name,
                email: rows[0].email
            };
        } else {
            return {
                firstName: rows[0].first_name,
                lastName: rows[0].last_name
            };
        }


    } catch (err) {
        Logger.error(err); // implement a logger
    } finally {
        await conn.release();
    }
};

const updateUser = async (id: number, token: string, body: any) : Promise<any> => {
    // Update a user in the database
    // I might create a service for the updating functions to make it more modular
    // Doesn't seem to be sending requests properly. It might be to do with async / await stuff in services
    const conn = await getPool().getConnection();
    try {
        // Make sure that the id is valid
        const findUser = "SELECT * FROM user WHERE id = ?";
        const [userExists] = await conn.query(findUser, [id]);
        if (userExists.length === 0) {
            throw new BadRequestError("User does not exist.");
        }


        // Make sure that the token is valid
        let users;
        try { // Using a try catch block to make sure that the token is valid since that works a bit better than my original if statement
            const userQuery = 'SELECT * FROM user WHERE auth_token = ?';
            [users] = await conn.query(userQuery, [token]);
        } catch (err) {
            throw err;
        }

        if (!users || users.length === 0) {
            throw new InvalidGivenError("Invalid token given!");
        }

        const user = users[0];
        if (user.id !== id) {
            throw new InvalidGivenError("User id and token do not match!");
        }
        const originalFirstName = user.first_name;
        const originalLastName = user.last_name;
        const originalEmail = user.email;
        const originalPassword = user.password;


        let firstName : string = null;
        if (body.hasOwnProperty('firstName')) {
            firstName = body.firstName;
        }
        if (firstName === "") {
            throw new InvalidGivenError("First name cannot be empty!");
        }
        if (firstName !== null && firstName.length > 64) {
            throw new InvalidGivenError("First name is too long!");
        }

        let lastName : string = null;
        if (body.hasOwnProperty('lastName')) {
            lastName = body.lastName;
        }
        if (lastName === "") {
            throw new InvalidGivenError("Last name cannot be empty!");
        }
        if (lastName !== null && lastName.length > 64) {
            throw new InvalidGivenError("Last name is too long!");
        }

        let email : string = null;
        if (body.hasOwnProperty('email')) {
            email = body.email;
            const validEmail = await emails.validateEmail(email);
            if (validEmail === false) {
                throw new InvalidGivenError("Invalid email format!");
            }
        }
        if (email === "") {
            throw new InvalidGivenError("Email cannot be empty!");
        }
        if (email !== null && email.length > 256) {
            throw new InvalidGivenError("Email is too long!");
        }


        let currentPassword : string = null;
        let password : string = null;
        if (body.hasOwnProperty('password')) {
            if(!body.hasOwnProperty('currentPassword')) {
                throw new InvalidGivenError("Current password not provided!");
            }
            currentPassword = body.currentPassword;
            password = body.password;
            if (password === "") {
                throw new InvalidGivenError("Password cannot be empty!");
            } if (password.length < 6) {
                throw new InvalidGivenError("Password is too short!");
            } if (password.length > 64) {
                throw new InvalidGivenError("Password is too long!");
            }
        }


        if (currentPassword && password) {
            const storedPasswordHash = user.password;
            const arePasswordsSame = await encrypt.compare(currentPassword, storedPasswordHash);
            if (!arePasswordsSame) {
                throw new InvalidGivenError("Current password is incorrect. Please try again.");
            }
            if (currentPassword === password) { // I am basing this on the assumption that currentPassword is always the correct input
                throw new ForbiddenError("New password cannot be the same as the old password!");
            }

            const newPasswordHash = await passwords.hash(password);
            const updatePasswordQuery = "UPDATE user SET password = ? WHERE id = ? AND auth_token = ?";
            await conn.query(updatePasswordQuery, [newPasswordHash, id, token]);
        }

        // using the current values as defaults if they were not provided in the body, so we don't use nulls
        const newFirstName = firstName || originalFirstName;
        const newLastName = lastName || originalLastName;
        const newEmail = email || originalEmail;

        // doing the other query separately because the password query is a bit more tricky due to hashes
        const updateQuery = "UPDATE user SET first_name = ?, last_name = ?, email = ? WHERE id = ? AND auth_token = ?";
        const values = [newFirstName, newLastName, newEmail, id, token];
        await conn.query(updateQuery, values);

        return {firstName: newFirstName, lastName: newLastName, email: newEmail, password};


    } catch (err) {
        Logger.error(err);
        throw err;
    } finally {
        await conn.release();
    }

};

export {insert, loggingIn, loggingOut, getUser, updateUser}
