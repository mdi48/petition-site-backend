import { start } from "repl";
import { getPool } from "../../config/db";
import Logger from "../../config/logger";
import * as petitionFuncs from "../services/petitions";
import { NotFoundError } from "../services/custom-errors/NotFoundError";
import { InvalidGivenError } from "../services/custom-errors/InvalidGivenError";
import { ForbiddenError } from "../services/custom-errors/ForbiddenError";
import { update } from "../controllers/user.controller";


const getPetitions = async (params: any): Promise<any> => {
    // Handles getting all petitions
    // change to make it take in only a single titular parameter called params
    // May move the sortMethod and limitOffset functions later on to a service file
    try {
        const conn = await getPool().getConnection();


        let q : string = null;
        if (params.hasOwnProperty('q')) {
            // Need to trim any whitespace
            q = `%${params.q.trim().replace(/^'|'$/g, "")}%`;
            // Look in the petition description table for a match for word that
            // matches the q variable. We want to filter out petitions whose description
            // contains this "q word".
        }
        if (q === '%%') {
            throw new InvalidGivenError("Empty q given!"); // Case where an invalid q parameter is given
        }

        let categoryIds : number[] = null;
        if (params.hasOwnProperty('categoryIds')) {
            // Need to check if the category exists
            categoryIds = params.categoryIds;
        }

        let ownerId : number = null;
        if (params.hasOwnProperty('ownerId')) {
            // Need to check if the owner exists
            ownerId = Number(params.ownerId);
        }

        let supportingCost : number = null;
        if (params.hasOwnProperty('supportingCost')) {
            // Less than or equal to this number is returned if in query
            supportingCost = Number(params.supportingCost);
        }
        if ((isNaN(supportingCost)) || supportingCost < 0) {
            throw new InvalidGivenError("Invalid supportingCost given!"); // Case where an invalid supportingCost parameter is given
        }

        let supporterId : number = null;
        if (params.hasOwnProperty('supporterId')) {
            // Need to check if the supporter exists
            supporterId = Number(params.supporterId);
        }
        if (isNaN(supporterId)) {
            throw new InvalidGivenError("Invalid supporterId given!"); // Case where an invalid supporterId parameter is given
        }


        let sortBy : string;
        if (params.hasOwnProperty('sortBy')) {
            sortBy = params.sortBy;
            const availableSorts = ['ALPHABETICAL_ASC', 'ALPHABETICAL_DESC', 'COST_ASC', 'COST_DESC', 'CREATED_ASC', 'CREATED_DESC'];
            if (!availableSorts.includes(sortBy)) {
                throw new InvalidGivenError("Invalid sort given!"); // Case where an invalid sortBy parameter is given
            }
            sortBy = await petitionFuncs.sortBy(sortBy);
        } else {
            sortBy = ' ORDER BY petition.creation_date ASC';
        }

        let categoryIdsString : string = '';
        if (categoryIds !== null) {
            categoryIdsString = categoryIds.join(',');
        }


        const sqlQuery = 'SELECT petition.id AS petitionId, petition.title AS title, category.id AS categoryId, user.id as ownerId, user.first_name AS ownerFirstName, user.last_name AS ownerLastName, petition.creation_date as creationDate, support_tier.cost as supportingCost ' +
            'FROM petition RIGHT JOIN category ON petition.category_id = category.id JOIN user ON petition.owner_id = user.id JOIN support_tier ON petition.id = support_tier.petition_id JOIN supporter on petition.id = supporter.petition_id ' +
            'WHERE ' +
            'petition.description LIKE COALESCE(?, petition.description) ' +
            (categoryIds ? 'AND category.id IN ('+ categoryIdsString+ ') ' : '') +
            (supportingCost !== null ? ' AND support_tier.cost <= '+ supportingCost : '')+
            (ownerId !== null ? ' AND user.id LIKE COALESCE(?, user.id) ' : '') +
            (supporterId !== null ? ' AND supporter.user_id = '+ supporterId : '') +
            ' GROUP BY petition.id' + sortBy + ', petition.id ASC';
        // Go back to SQL stuff. I can't remember how to do long queries like this effectively
        // slice after sql query, it will help with the counting/petitions.length difference
        // Logger.info(sqlQuery);




        const [rows] = await conn.query(sqlQuery, [q, ownerId]);

        let startIndex : number = null;
        let count : number = null;
        if (params.hasOwnProperty('count') || params.hasOwnProperty('startIndex')) {
            count = Number(params.count);
            startIndex = Number(params.startIndex);
        }


        let slicedRows; // testing a different version of this slicing to make it easier for me
        if (count !== null) {
            slicedRows = rows.slice(startIndex, startIndex + count);
        } else {
            slicedRows = rows.slice(startIndex);
        } // this works better than LIMIT and OFFSET in SQL queries as I've found. Will remove the limitOffset function later


        await conn.release();
        let petitionsJSON;
        petitionsJSON = await slicedRows.map((row: any) => ({
            petitionId: row.petitionId,
            title: row.title,
            categoryId: row.categoryId,
            ownerId: row.ownerId,
            ownerFirstName: row.ownerFirstName,
            ownerLastName: row.ownerLastName,
            creationDate: row.creationDate,
            supportingCost: row.supportingCost
        }));

        return {
            count: rows.length,
            petitions: petitionsJSON
        };

    } catch (err) {
        if (err instanceof InvalidGivenError) {
            throw err;
        }
        Logger.error(err);
        throw err;

    }
};

const getPetitionById = async (id: number): Promise<any> => { // Completely done
    try {
        const conn = await getPool().getConnection();
        const query = 'SELECT petition.id as petitionId, petition.title as title, petition.description as description,'+
        ' petition.description as description, petition.creation_date as creationDate, petition.image_filename as imageFilename,'+
        ' petition.owner_id as ownerId, petition.category_id as categoryId, support_tier.id as supportTierId, support_tier.title as supportTierTitle,'+
        ' support_tier.description as supportTierDescription, support_tier.cost as supportTierCost, supporter.id as supporterId, supporter.user_id as supporterUserId'+
        ' FROM petition LEFT JOIN support_tier ON petition.id = support_tier.petition_id LEFT JOIN supporter ON petition.id = supporter.petition_id'+
        ' WHERE petition.id = ?';
        const [rows] = await conn.query(query, [id]);
        // Logger.info(rows);

        await conn.release();

        // grouping rows by petitionId
        const groupedRows = rows.reduce((grouped:any, row:any) => {
            (grouped[row.petitionId] = grouped[row.petitionId] || []).push(row);
            return grouped;
        }, {});

        // formatting the grouped rows into a JSON object
        const result = Object.values(groupedRows).map((group: any) => {
            const petition = group[0];
            return {
                petitionId: petition.petitionId,
                title: petition.title,
                description: petition.description,
                creationDate: petition.creationDate,
                imageFilename: petition.imageFilename,
                ownerId: petition.ownerId,
                categoryId: petition.categoryId,
                supportTiers: group.map((row: any) => ({
                    supportTierId: row.supportTierId,
                    title: row.supportTierTitle,
                        description: row.supportTierDescription,
                        cost: row.supportTierCost
                })),
                supporters: group.map((row: any) => ({
                    supporterId: row.supporterId,
                    userId: row.supporterUserId
                }))
            };
        });
        // It took me an embarassingly long time to realize that it was the controller that was going wrong

        // Logger.info(result[0]);
        return result[0];

    } catch (err) {
        Logger.error(err);
        throw err;
    }

};

const postPetition = async (token: string, title: string, description: string, categoryId: number, supportTiers: any[]): Promise<any> => {
    const conn = await getPool().getConnection();
    try {

        // Make sure that the token is valid
        const userQuery = 'SELECT * FROM user WHERE auth_token = ?';
        const [users] = await conn.query(userQuery, [token]);
        if (users.length === 0) {
            throw new InvalidGivenError("Invalid token given!");
        }
        const ownerId = users[0].id;


        // Make sure title is unique, if not, throw an error
        const titleQuery = 'SELECT * FROM petition WHERE title = ?';
        const [titles] = await conn.query(titleQuery, [title]);
        if (titles.length > 0) {
            throw new ForbiddenError("Title already exists!");
        }

        // Make sure that the category exists
        const categoryQuery = 'SELECT * FROM category WHERE id = ?';
        const [categories] = await conn.query(categoryQuery, [categoryId]);
        if (categories.length === 0) {
            throw new InvalidGivenError("Invalid category given!");
        }

        // Make sure that the supportTiers are between 1 and 3
        if (supportTiers.length < 1 || supportTiers.length > 3) {
            throw new InvalidGivenError("Invalid supportTiers given!");
        }

        // Make sure that the supportTiers are unique and have a cost which is a non-negative number
        const supportTierTitles = new Set();
        for (const tier of supportTiers) {
            if (supportTierTitles.has(tier.title)) {
                throw new InvalidGivenError("Support tier titles must be unique!");
            }
            if (typeof tier.cost !== 'number' || tier.cost < 0) {
                throw new InvalidGivenError("Each support tier must have a cost property that is a non-negative number!");
            }
            supportTierTitles.add(tier.title);
        }


        const currentDate = new Date();

        // Insert the petition
        const insertPetitionQuery = 'INSERT INTO petition (title, description, category_id, creation_date, owner_id) VALUES (?, ?, ?, ?, ?)';
        const [petition] = await conn.query(insertPetitionQuery, [title, description, categoryId, currentDate, ownerId]);

        const petitionId = petition.insertId;

        // Insert the support tiers

        for (const tier of supportTiers) {
            const insertSupportTierQuery = 'INSERT INTO support_tier (title, description, cost, petition_id) VALUES (?, ?, ?, ?)';
            await conn.query(insertSupportTierQuery, [tier.title, tier.description, tier.cost, petitionId]);
        }

        return petitionId;

    } catch (err) {
        Logger.error(err);
        throw err;
    } finally {
        await conn.release();
    }
};


const getCategories = async (): Promise<any> => { // Completely done
    try {
        const conn = await getPool().getConnection();
        const query = 'SELECT * FROM category';
        const [rows] = await conn.query(query);

        await conn.release();
        return rows;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const makeChanges = async (id: number, body: any, token: string): Promise<any> => {
    const conn = await getPool().getConnection();
    try {
        // Make sure that the id is valid
        if (isNaN(id)) {
            throw new InvalidGivenError("Invalid id given!");
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




        // Gets the petition that user wants to update
        const petitionQuery = 'SELECT * FROM petition WHERE id = ?';
        const [petitions] = await conn.query(petitionQuery, [id]);

        // If the petition doesn't exist, throw an error
        if (!petitions || petitions.length === 0) {
            throw new InvalidGivenError("Invalid petition given!");
        }

        // If the user doesn't own the petition, throw an error
        if (petitions[0].owner_id !== users[0].id) {
            throw new ForbiddenError("User does not own the petition!");
        }




        let title : string = null;
        if (body.hasOwnProperty('title')) {
            title = body.title;
        }
        // Title has to be within a certain length
        if (title === "") {
            throw new InvalidGivenError("Title cannot be empty!");
        }
        if (title && title.length > 128) {
            throw new InvalidGivenError("Title too long!");
        }

        // Make sure title is unique, if not, throw an error
        let titles;
        if (title !== null) {
            try {
                const titleQuery = 'SELECT * FROM petition WHERE title = ?';
                [titles] = await conn.query(titleQuery, [title]);
            } catch (err) {
                throw err;
            }
            if (!titles || titles.length > 0) {
                throw new InvalidGivenError("Title already exists!");
            }
        }

        let description : string = null;
        if (body.hasOwnProperty('description')) {
            description = body.description;
        }
        if (description === "") {
            throw new InvalidGivenError("Description cannot be empty!");
        }
        if (description && description.length > 1024) {
            throw new InvalidGivenError("Description too long!");
        }


        let categoryId : number = null;
        if (body.hasOwnProperty('categoryId')) {
            categoryId = body.categoryId;
            if (typeof categoryId !== 'number') {
                throw new InvalidGivenError("Invalid categoryId given!");
            }
        }

        let categories;
        if (categoryId !== null) {
            try {
                const categoryQuery = 'SELECT * FROM category WHERE id = ?';
                [categories] = await conn.query(categoryQuery, [categoryId]);
            } catch (err) {
                throw err;
            }

            if (!categories || categories.length === 0) {
                throw new InvalidGivenError("Invalid category given!");
            }
        }


        let supportTiers : any[];
        if (body.hasOwnProperty('supportTiers')) {
            supportTiers = body.supportTiers;

            // Make sure that the supportTiers are between 1 and 3
            if (supportTiers.length < 1 || supportTiers.length > 3) {
                throw new InvalidGivenError("Invalid supportTiers given!");
            }

            // Make sure that the supportTiers are unique
            const supportTierTitles = new Set();
            for (const tier of supportTiers) {
                if (supportTierTitles.has(tier.title)) {
                    throw new InvalidGivenError("Invalid supportTiers given!");
                }
                supportTierTitles.add(tier.title);
            }
        };


        // Update the petition
        let updatePetitionQuery = 'UPDATE petition SET ';
        const updateValues = [];

        if (title !== null) {
            updatePetitionQuery += 'title = ?, ';
            updateValues.push(title);
        }
        if (description !== null) {
            updatePetitionQuery += 'description = ?, ';
            updateValues.push(description);
        }
        if (categoryId !== null) {
            updatePetitionQuery += 'category_id = ?, ';
            updateValues.push(categoryId);
        }

        updatePetitionQuery = updatePetitionQuery.slice(0, -2); // Remove the last comma and space

        updatePetitionQuery += ' WHERE id = ?';
        updateValues.push(id);

        const results = await conn.query(updatePetitionQuery, updateValues);


        // Update the support tiers
        if(Array.isArray(supportTiers) && supportTiers.length > 0) {
            const updateSupportTierQuery = 'UPDATE support_tier SET title = ?, description = ?, cost = ? WHERE petition_id = ?';
            for (const tier of supportTiers) {
                await conn.query(updateSupportTierQuery, [tier.title, tier.description, tier.cost, id]);
            }
        }

        return id; // This did actually update, it just seems to be stuck in the loading screen for whatever reason


    } catch (err) {
        Logger.error(err);
        throw err;
    } finally {
        await conn.release();
    }
};

const deletingPetition = async (id: number, token: string) : Promise<any> => {
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
            throw new InvalidGivenError("Invalid token given!");
        }

        // Gets the petition that user wants to update
        const petitionQuery = 'SELECT * FROM petition WHERE id = ?';
        const [petitions] = await conn.query(petitionQuery, [id]);

        // If the petition doesn't exist, throw an error
        if (!petitions || petitions.length === 0) {
            throw new NotFoundError("No such petition found!");
        }

        // If the user doesn't own the petition, throw an error
        if (petitions[0].owner_id !== users[0].id) {
            throw new ForbiddenError("User does not own the petition!");
        }

        // Check if the petition has any supporters
        const supporterQuery = 'SELECT * FROM supporter WHERE petition_id = ?';
        const [supporters] = await conn.query(supporterQuery, [id]);

        // if the petition has any supporters, throw an error
        if (supporters && supporters.length > 0) {
            throw new ForbiddenError("Petition has supporters!");
        }

        // Delete the petition
        const deletePetitionQuery = 'DELETE FROM petition WHERE id = ?';
        await conn.query(deletePetitionQuery, [id]);

        return id;

    } catch (err) {
        Logger.error(err);
        throw err;
    } finally {
        await conn.release();
    }
};

export {getPetitions, getPetitionById, postPetition, getCategories, makeChanges, deletingPetition};
