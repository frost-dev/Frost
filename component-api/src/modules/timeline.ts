import { IChatPostingDocument, ChatPostingDocument } from './documents';
import { EndpointManager } from './Endpoint';
import { ObjectId } from 'mongodb';
import { IChatPosting } from './ApiResponse/packingObjects';

export default async function(manager: EndpointManager, userIds: ObjectId[]): Promise<IChatPosting[]> {
	const chatPostingRaws: IChatPostingDocument[] = await manager.db.findArray('api.postings', {
		type: 'chat',
		userId: { $in: userIds }
	});
	const chatPostingDocs = chatPostingRaws.map(docRaw => new ChatPostingDocument(docRaw));

	return manager.packAll(chatPostingDocs);
}
