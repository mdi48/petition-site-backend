import {Express} from "express";
import {rootUrl} from "./base.routes";
import * as user from '../controllers/user.controller';
import * as userImages from '../controllers/user.image.controller';

module.exports = (app: Express) => {
    app.route(rootUrl+'/users/register')
        .post(user.register); // All done

    app.route(rootUrl+'/users/login')
        .post(user.login); // All done

    app.route(rootUrl+'/users/logout')
        .post(user.logout); // All done

    app.route(rootUrl+'/users/:id')
        .get(user.view) // All done
        .patch(user.update);

    app.route(rootUrl+'/users/:id/image')
        .get(userImages.getImage) // All done
        .put(userImages.setImage)
        .delete(userImages.deleteImage)
};
