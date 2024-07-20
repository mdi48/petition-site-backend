import * as encrypt from 'bcrypt';
import { getPool} from "../../config/db";
import Logger from "../../config/logger";



const hash = async (password: string): Promise<string> => {
    // Todo: update this to encrypt the password
    try {
        const saltRounds = 10;
        const salt = await encrypt.genSalt(saltRounds);
        Logger.info(`Salt: ${salt}`);
        const hashKey = await encrypt.hash(password, salt);
        Logger.info(`Hash: ${hashKey}`);
        return hashKey;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const getHashedPassword = async (email: string): Promise<any> => {
    // Todo: (suggested) update this to compare the encrypted passwords
    // Ended up changing to get the hashed password for the user
    try {
        const conn = await getPool().getConnection();
        const query = 'SELECT password FROM user WHERE email = ?';
        const result = await conn.query(query, [email]);
        await conn.release();
        return result[0][0].password; // returns the hashed password
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const getUidViaToken = async (token: string): Promise<any> => {
    try { // testing for now
        const conn = await getPool().getConnection();
        const query = 'SELECT user_id, auth_token FROM user WHERE auth_token = ?';
        const result = await conn.query(query, [token]);
        await conn.release();
        return result[0][0].userId; // returns the user id
    } catch (err) {
        Logger.error(err);
        throw err;
    };
};

// const confirmPassword = async (password: string, comp: string): Promise<boolean> => {
    // gives True if password in db
    // try {
        // const conn = await db.getPool().getConnection();
    // }
// }


export {hash, getHashedPassword, getUidViaToken}
