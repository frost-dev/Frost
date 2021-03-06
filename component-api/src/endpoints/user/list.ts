import $ from 'cafy';
import { define, AuthScopes, ApiErrorSources } from '../../modules/endpoint';
import { UserDocument, IUserDocument } from '../../modules/documents';
import { UsersResponseObject } from '../../modules/apiResponse/responseObjects';

export default define({
	params: {
	},
	scopes: [AuthScopes.userRead]
}, async (manager) => {

	const userDocRaws: (IUserDocument | null)[] = await manager.db.findArray('api.users', { });

	const userDocs: UserDocument[] = [];
	for (const userDocRaw of userDocRaws) {
		if (userDocRaw) {
			userDocs.push(new UserDocument(userDocRaw));
		}
	}

	const users = await manager.packAll(userDocs);

	manager.ok(new UsersResponseObject(users));
});
