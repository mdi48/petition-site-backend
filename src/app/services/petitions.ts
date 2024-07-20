import {getPool} from '../../config/db';
import Logger from '../../config/logger';
import { InvalidGivenError } from './custom-errors/InvalidGivenError';

const sortBy = async (sortGiven: string): Promise<string> => {
    // Handles sorting the petitions
        switch(sortGiven) {
            case 'ALPHABETICAL_ASC':
                return ' ORDER BY petition.title ASC';
            case 'ALPHABETICAL_DESC':
                return ' ORDER BY petition.title DESC';
            case 'COST_ASC':
                return ' ORDER BY MIN(support_tier.cost) ASC' ;
            case 'COST_DESC':
                return ' ORDER BY MIN(support_tier.cost) DESC' ;
            case 'CREATED_ASC':
                return ' ORDER BY petition.creation_date ASC';
            case 'CREATED_DESC':
                return ' ORDER BY petition.creation_date DESC';
        }
};

const getCategories = async (): Promise<any> => {
    // Handles getting the categories
    const conn = await getPool().getConnection();
    try {
        const query = 'SELECT id as categoryID, name FROM category';
        const [rows] = await conn.query(query);
        return rows;
    } catch (err) {
        Logger.error(err);
        throw err;
    } finally {
        await conn.release();
    }
};

const limitOffset = async (startIndex: any, count: any): Promise<any> => {
    try {
        if (startIndex == null && count == null) {
            return '';
        }
        if (count) {
            if (startIndex) {
                return `LIMIT ${startIndex} OFFSET ${count + Number(startIndex-1)}`;
            }
            else {
                return `LIMIT ${count}`;
            }
        }
        else {
            return `OFFSET ${startIndex}`;
        }
    } catch (err) {
        Logger.error(err);
        throw err;
    }

};

export {sortBy, limitOffset};
