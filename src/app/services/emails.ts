import { getPool } from "../../config/db";

const validateEmail = (email: string) : Promise<boolean> => {
    const re = /\S+\S+@\S+\.\S+/; // one or more non-whitespace,literal@,one or more non-whitespace,literal.,one or more non-whitespace
    return Promise.resolve(re.test(email));
};

const checkEmailExists = async (email: string) : Promise<boolean> => {
    const conn = await getPool().getConnection();
    const query = "SELECT * FROM user WHERE email = ?";
    const [rows] = await conn.query( query, [ email ]);
    await conn.release();
    return rows.length > 0 && rows[0].email === email;
};

export {validateEmail, checkEmailExists}
