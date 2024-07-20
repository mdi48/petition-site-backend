import {getPool} from '../../config/db'
import Logger from '../../config/logger';
import { NotFoundError } from '../services/custom-errors/NotFoundError';
import { BadRequestError } from '../services/custom-errors/BadRequestError';
import { InvalidGivenError } from '../services/custom-errors/InvalidGivenError';
import { ForbiddenError } from '../services/custom-errors/ForbiddenError';

const addSupportTier = async (id: number, token: string, body: any) : Promise<any> => {
    const conn = await getPool().getConnection();
    try {
        const validIdQuery = 'SELECT * FROM petition WHERE id = ?';
        const [validIdResult] = await conn.query(validIdQuery, [id]);
        if (validIdResult.length === 0) {
            throw new NotFoundError("Petition with given Id not found!");
        }

        const validTokenQuery = 'SELECT * FROM user WHERE auth_token = ?';
        const [validTokenResult] = await conn.query(validTokenQuery, [token]);
        if (validTokenResult.length === 0) {
            throw new ForbiddenError("Invalid auth token!");
        }

        if (validIdResult[0].owner_id !== validTokenResult[0].id) {
            throw new ForbiddenError("User does not own the petition!");
        }

        let title;
        if (body.title === undefined) {
            throw new BadRequestError("Title is required!");
        } else {
            title = body.title;
        }

        if (title.length === 0 || title.length > 128) {
            throw new BadRequestError("Title must be between 1 and 128 characters!");
        }

        let description;
        if (body.description === undefined) {
            throw new BadRequestError("Description is required!");
        } else {
            description = body.description;
        }

        if (description.length === 0 || description.length > 1024) {
            throw new InvalidGivenError("Description must be between 1 and 1024 characters!");
        }

        let cost;
        if (body.cost === undefined) {
            throw new BadRequestError("Cost is required!");
        } else {
            cost = body.cost;
        }

        if (typeof cost !== "number" || cost < 0) {
            throw new BadRequestError("Cost must be a positive integer!");
        }

        const getSupportTiersQuery = 'SELECT * FROM support_tier WHERE petition_id = ?';
        const [getSupportTiersResult] = await conn.query(getSupportTiersQuery, [id]);
        if (getSupportTiersResult.length >= 3) {
            throw new ForbiddenError("Maximum support tiers allowed already reached!");
        }


        const insertQuery = 'INSERT INTO support_tier (petition_id, title, description, cost) VALUES (?, ?, ?, ?)';
        const [insertResult] = await conn.query(insertQuery, [id, title, description, cost]);
        return insertResult;

    } catch (err) {
        Logger.error(err);
        throw err;
    } finally {
        await conn.release();
    }
};

const editSupportTier = async (petitionId: number, token: string, tierId: number, body: any): Promise<any> => {

    const conn = await getPool().getConnection();
    try {
        // Check if the petition exists
        const validIdQuery = 'SELECT * FROM petition WHERE id = ?';
        const [validIdResult] = await conn.query(validIdQuery, [petitionId]);
        if (validIdResult.length === 0) {
            throw new NotFoundError("Petition with given Id not found!");
        }

        // Check if the token is valid
        const validTokenQuery = 'SELECT * FROM user WHERE auth_token = ?';
        const [validTokenResult] = await conn.query(validTokenQuery, [token]);
        if (validTokenResult.length === 0) {
            throw new ForbiddenError("Invalid auth token!");
        }

        // If the user doesn't own the petition, throw an error
        if (validIdResult[0].owner_id !== validTokenResult[0].id) {
            throw new ForbiddenError("User does not own the petition!");
        }



        const validTierIdQuery = 'SELECT * FROM support_tier WHERE id = ?';
        const [validTierIdResult] = await conn.query(validTierIdQuery, [tierId]);
        if (validTierIdResult.length === 0) {
            throw new NotFoundError("Support tier with given Id not found!");
        }

        const title = body.hasOwnProperty('title') ? body.title : null;

        if (title && (title.length === 0 || title.length > 128)) {
            throw new BadRequestError("Title must be between 1 and 128 characters!");
        }

        const description = body.hasOwnProperty('description') ? body.description : null;

        if (description && (description.length === 0 || description.length > 1024)) {
            throw new BadRequestError("Description must be between 1 and 1024 characters!");
        }

        const cost = body.hasOwnProperty('cost') ? body.cost : null;

        if (cost && (typeof cost !== 'number' || cost < 0)) { // can't seem to get it to check if it's an integer properly
            throw new BadRequestError("Cost must be a positive integer!");
        }

        const supporterQuery = 'SELECT * FROM supporter WHERE support_tier_id = ?';
        const [supporterResult] = await conn.query(supporterQuery, [tierId]);
        if (supporterResult.length > 0) {
            throw new ForbiddenError("Support tier already has supporters!");
        }


        // PATCH the support tier with given information
        let updateSupportTierQuery = 'UPDATE support_tier SET ';
        const updateValues = [];

        if (title !== null) {
            updateSupportTierQuery += 'title = ?, ';
            updateValues.push(title);
        }

        if (description !== null) {
            updateSupportTierQuery += 'description = ?, ';
            updateValues.push(description);
        }

        if (cost !== null) {
            updateSupportTierQuery += 'cost = ?, ';
            updateValues.push(cost);
        }

        updateSupportTierQuery = updateSupportTierQuery.slice(0, -2); // Removing the last comma and space
        updateSupportTierQuery += ' WHERE id = ?';
        updateValues.push(tierId);

        const result = await conn.query(updateSupportTierQuery, updateValues);

        return result;


    } catch (err) {
        Logger.error(err);
        throw err;
    } finally {
        await conn.release();
    }

};

const deleteSupportTier = async (petitionId: number, token: string, tierId: number): Promise<any> => {

    const conn = await getPool().getConnection();
    try {
        // Make sure that the token is valid
        let users;
        try { // Using a try catch block to make sure that the token is valid since that works a bit better than my original if statement
            const userQuery = 'SELECT * FROM user WHERE auth_token = ?';
            [users] = await conn.query(userQuery, [token]);
        } catch (err) {
            throw err;
        }
        if (!users || users.length === 0) {
            throw new ForbiddenError("Invalid auth token!");
        }

        // Make sure that the petition exists
        let petitions;
        try {
            const petitionQuery = 'SELECT * FROM petition WHERE id = ?';
            [petitions] = await conn.query(petitionQuery, [petitionId]);
        } catch (err) {
            throw err;
        }
        if (!petitions || petitions.length === 0) {
            throw new NotFoundError("Petition with given Id not found!");
        }

        // Make sure that the user owns the petition
        if (petitions[0].owner_id !== users[0].id) {
            throw new ForbiddenError("User does not own the petition!");
        }

        // Make sure that the support tier exists
        let supportTiers;
        try {
            const supportTierQuery = 'SELECT * FROM support_tier WHERE id = ?';
            [supportTiers] = await conn.query(supportTierQuery, [tierId]);
        } catch (err) {
            throw err;
        }
        if (!supportTiers || supportTiers.length === 0) {
            throw new NotFoundError("Support tier with given Id not found!");
        }

        // Make sure that the support tier has no supporters
        let supporters;
        try {
            const supporterQuery = 'SELECT * FROM supporter WHERE support_tier_id = ?';
            [supporters] = await conn.query(supporterQuery, [tierId]);
        } catch (err) {
            throw err;
        }
        if (supporters.length > 0) {
            throw new ForbiddenError("Support tier already has supporters!");
        }

        // if support tier is the only support tier for that petition, we cannot delete it and must return an error
        let supportTiersForPetition;
        try {
            const supportTiersForPetitionQuery = 'SELECT * FROM support_tier WHERE petition_id = ?';
            [supportTiersForPetition] = await conn.query(supportTiersForPetitionQuery, [petitionId]);
        } catch (err) {
            throw err;
        }
        if (supportTiersForPetition.length === 1) {
            throw new ForbiddenError("Cannot delete the only support tier for a petition!");
        }

        // if all checks pass, we can delete the support tier

        // Delete the support tier from petition
        const deleteSupportTierQuery = 'DELETE FROM support_tier WHERE id = ?';
        const result = await conn.query(deleteSupportTierQuery, [tierId]);
        return result;


    } catch (err) {
        Logger.error(err);
        throw err;

    } finally {
        await conn.release();
    }

};


export {addSupportTier, editSupportTier, deleteSupportTier};
