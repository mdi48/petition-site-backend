import {getPool} from '../../config/db';
import Logger from '../../config/logger';
import { BadRequestError } from '../services/custom-errors/BadRequestError';
import { ForbiddenError } from '../services/custom-errors/ForbiddenError';
import { NotFoundError } from "../services/custom-errors/NotFoundError";

const getSupporters = async (id: number): Promise<any> => {
    // Get a list of all supporters of the specified petition.
    // The supporters are returned in reverse chronological order (from most recent to oldest) by `timestamp`
    // If the petition does not exist, return a 404 error.
    const conn = await getPool().getConnection();
    try {
        const query = "SELECT id FROM petition WHERE id = ?;";
        const [rows] = await conn.query(query, [id]);
        if (rows[0] === undefined || rows[0] === null) {
            throw new NotFoundError("Petition not found!"); // throw 404 if petition not found
        }

        const sqlQuery = 'SELECT supporter.id AS supportId, supporter.support_tier_id as supportTierId,' +
        ' supporter.message, supporter.user_id as supporterId, user.first_name as supporterFirstName, user.last_name as supporterLastName,' +
        ' supporter.timestamp as timestamp FROM petition JOIN supporter on petition.id = supporter.petition_id JOIN user on supporter.user_id = user.id WHERE' +
        ' petition_id = ? ORDER BY timestamp DESC;';
        const [supporters] = await conn.query(sqlQuery, [id]);

        let supportJSON;
        supportJSON = supporters.map((supporter: any) => ({
                supportId: supporter.supportId,
                supportTierId: supporter.supportTierId,
                message: supporter.message,
                supporterId: supporter.supporterId,
                supporterFirstName: supporter.supporterFirstName,
                supporterLastName: supporter.supporterLastName,
                timestamp: supporter.timestamp
        }));
        return supportJSON;
    } catch (err) {
        Logger.error(err);
        throw err;
    } finally {
        await conn.release();
    }
};

const giveSupport = async (id: number, token: string, body: any): Promise<any> => {
    // Add a new supporter to the specified petition. The supporter is identified by their `X-Authorization` token.
    // If the token is invalid, return a 401 error.
    // If the petition does not exist, return a 404 error.
    // If the body is invalid, return a 400 error.
    // If the user is already a supporter of the petition, return a 403 error.
    // If the user is the owner of the petition, return a 403 error.
    const conn = await getPool().getConnection();
    try {
        const query = "SELECT id FROM petition WHERE id = ?;";
        const [rows] = await conn.query(query, [id]);
        if (rows[0] === undefined || rows[0] === null) {
            throw new NotFoundError("Petition not found!");
        }
        const userQuery = "SELECT id FROM user WHERE auth_token = ?;";
        const [userRows] = await conn.query(userQuery, [token]);
        if (userRows[0] === undefined || userRows[0] === null) {
            throw new NotFoundError("User not found!");
        }

        const userId = userRows[0].id;

        const supportTierId = body.supportTierId;
        if (supportTierId === undefined || !Number.isInteger(supportTierId)) {
            throw new BadRequestError("supportTierId invalid! Please make sure it is an integer!");
        }
        const supporterQuery = "SELECT * FROM supporter WHERE user_id = ? AND petition_id = ? AND support_tier_id = ?;";
        const [supporterRows] = await conn.query(supporterQuery, [userId, id, supportTierId]);
        if (supporterRows.length > 0) {
            throw new ForbiddenError("User is already a supporter of the petition!");
        }

        const checkIfOwner = "SELECT id FROM petition WHERE id = ? AND owner_id = ?;";
        const [ownerRows] = await conn.query(checkIfOwner, [id, userId]);
        if (ownerRows[0] !== undefined && ownerRows[0] !== null) {
            throw new ForbiddenError("User is the owner of the petition!");
        }

        const message = body.message !== undefined ? body.message : null;
        if (message !== null && typeof message !== 'string') {
            throw new BadRequestError("Message must be a string!");
        }
        if (message !== null && (message.length > 512 || message.length < 1)) {
            throw new BadRequestError("Message must be between 1 and 512 characters (inclusive)!");
        }
        const timestamp = new Date();

        const insertQuery = "INSERT INTO supporter (petition_id, support_tier_id, user_id, message, timestamp) VALUES (?, ?, ?, ?, ?);";
        const [result] = await conn.query(insertQuery, [id, supportTierId, userId, message, timestamp]);

        return result;
    } catch (err) {
        Logger.error(err);
        throw err;
    } finally {
        await conn.release();
    }

};

export {getSupporters, giveSupport};
