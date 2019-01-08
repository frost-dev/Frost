/*
	define the structure of the data stored in the database
*/

import { ObjectId } from 'mongodb';
import moment from 'moment';
import { MongoProvider } from 'frost-component';
import { IChatPosting, IUser, IApp } from './ApiResponse/packingObjects';

export interface IDocument<PackingObject> {
	pack(db: MongoProvider): Promise<PackingObject>;
}

// posting

export interface IChatPostingDocumentSoruce {
	userId: ObjectId;
	text: string;
	attachmentIds?: ObjectId[];
}

export interface IChatPostingDocument extends IChatPostingDocumentSoruce {
	_id: ObjectId;
}

export class ChatPostingDocument implements IDocument<IChatPosting> {
	constructor(raw: IChatPostingDocument) {
		this._id = raw._id;
		this.userId = raw.userId;
		this.text = raw.text;
		this.attachmentIds = raw.attachmentIds;
	}
	_id: ObjectId;
	type: string = 'chat';
	userId: ObjectId;
	text: string;
	attachmentIds?: ObjectId[];

	async pack(db: MongoProvider): Promise<IChatPosting> {
		if (this._id == null) {
			throw new Error('the document has not registered yet');
		}

		const userSource = await db.findById('api.users', this.userId);
		const userEntity = await new UserDocument(userSource).pack(db);

		let attachmentIds: string[] | undefined;
		if (this.attachmentIds != null) {
			attachmentIds = this.attachmentIds.map(attachmentId => attachmentId.toHexString());
		}

		return {
			id: this._id.toHexString(),
			createdAt: moment(this._id.getTimestamp()).format('X'),
			type: this.type,
			user: userEntity,
			text: this.text,
			attachmentIds: attachmentIds
		};
	}
}

// app

export interface IAppDocumentSoruce {
	name: string;
	creatorId: ObjectId;
	description: string;
	scopes: string[];
}

export interface IAppDocument extends IAppDocumentSoruce {
	_id: ObjectId;
}

export class AppDocument implements IAppDocument, IDocument<IApp> {
	constructor(raw: IAppDocument) {
		this._id = raw._id;
		this.name = raw.name;
		this.creatorId = raw.creatorId;
		this.description = raw.description;
		this.scopes = raw.scopes;
	}
	_id: ObjectId;
	name: string;
	creatorId: ObjectId;
	description: string;
	scopes: string[];

	async pack(db: MongoProvider): Promise<IApp> {
		if (this._id == null) {
			throw new Error('the document has not registered yet');
		}

		return {
			id: this._id.toHexString(),
			createdAt: moment(this._id.getTimestamp()).format('X'),
			name: this.name,
			creatorId: moment(this.creatorId.getTimestamp()).format('X'),
			description: this.description,
			scopes: []
		};
	}
}

// user

export interface IUserDocumentSoruce {
	screenName: string;
	passwordHash: string | null;
	name: string;
	description: string;
	root?: boolean;
}

export interface IUserDocument extends IUserDocumentSoruce {
	_id: ObjectId;
}

export class UserDocument implements IUserDocument, IDocument<IUser> {
	constructor(raw: IUserDocument) {
		this._id = raw._id;
		this.screenName = raw.screenName;
		this.passwordHash = raw.passwordHash;
		this.name = raw.name;
		this.description = raw.description;
		this.root = raw.root;
	}
	_id: ObjectId;
	screenName: string;
	passwordHash: string | null;
	name: string;
	description: string;
	root?: boolean;

	async pack(db: MongoProvider): Promise<IUser> {
		if (this._id == null) {
			throw new Error('the document has not registered yet');
		}

		let followingsCount: number;
		let followersCount: number;
		let postingsCount: { chat?: number };

		postingsCount = {};
		[followingsCount, followersCount, postingsCount.chat] = await Promise.all([
			db.count('api.userRelations', { source: this._id }),
			db.count('api.userRelations', { target: this._id }),
			db.count('api.postings', { type: 'chat', userId: this._id })
		]);

		return {
			id: this._id.toHexString(),
			createdAt: moment(this._id.getTimestamp()).format('X'),
			screenName: this.screenName,
			name: this.name,
			description: this.description,
			followingsCount: followingsCount,
			followersCount: followersCount,
			postingsCount: postingsCount
		};
	}
}