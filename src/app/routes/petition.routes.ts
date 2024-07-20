import {Express} from "express";
import {rootUrl} from "./base.routes";
import * as petition from '../controllers/petition.controller'
import * as petitionImage from '../controllers/petition.image.controller'
import * as supportTiers from "../controllers/petition.support_tier.controller";
import * as supporter from "../controllers/petition.supporter.controller";

module.exports = (app: Express) => {
    app.route(rootUrl+'/petitions')
        .get(petition.getAllPetitions) // All done I think
        .post(petition.addPetition);

    app.route(rootUrl+'/petitions/categories')
        .get(petition.getCategories); // All done I think

    app.route(rootUrl+'/petitions/:id')
        .get(petition.getPetition) // All done I think
        .patch(petition.editPetition)
        .delete(petition.deletePetition);

    app.route(rootUrl+'/petitions/:id/image')
        .get(petitionImage.getImage)
        .put(petitionImage.setImage);

    app.route(rootUrl+'/petitions/:id/supportTiers')
        .put(supportTiers.addSupportTier);

    app.route(rootUrl+'/petitions/:id/supportTiers/:tierId')
        .patch(supportTiers.editSupportTier)
        .delete(supportTiers.deleteSupportTier);

    app.route(rootUrl + '/petitions/:id/supporters')
        .get(supporter.getAllSupportersForPetition)
        .post(supporter.addSupporter);
}
