import $ from 'cafy';
import { define, AuthScopes, ApiErrorSources } from '../../endpoint';
import { UserRelationResponseObject } from '../../../response/responseObjects';
import { ObjectIdContext } from '../../../../misc/cafyValidators';

export default define({
	params: {
		targetUserId: $.type(ObjectIdContext)
	},
	scopes: [AuthScopes.userWrite]
}, async (manager) => {

	const account = manager.authInfo!.user;

	// params
	const targetUserId: string = manager.params.targetUserId;

	// fetch target user
	const targetUser = await manager.userService.findById(targetUserId);
	if (!targetUser) {
		manager.error(ApiErrorSources.userNotFound, { paramName: 'targetUserId' });
		return;
	}

	if (targetUser._id.equals(account._id)) {
		manager.error(ApiErrorSources.cannotSpecifyMyself, { paramName: 'targetUserId' });
		return;
	}

	const userRelationDoc = await manager.userRelationService.unfollow(account._id, targetUser._id);
	const userRelation = await userRelationDoc.pack(manager.db);

	manager.success(new UserRelationResponseObject(userRelation));
});