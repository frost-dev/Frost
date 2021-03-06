import $ from 'cafy';
import uid from 'uid2';
import { MongoProvider, ConsoleMenu, inputLine, ActiveConfigManager, getDataVersionState, DataVersionState } from 'frost-core';
import { Migrator } from 'frost-migration';
import migration from './migration';
import UserService from '../../services/UserService';
import AppService from '../../services/AppService';
import TokenService from '../../services/TokenService';
import { AuthScopes } from '../authScope';
import log from '../log';
import IApiConfig from '../IApiConfig';
import verifyApiConfig from '../verifyApiConfig';

const question = async (str: string) => (await inputLine(str)).toLowerCase().indexOf('y') === 0;

export default async function(db: MongoProvider, targetDataVersion: number) {

	// services
	const userService = new UserService(db);
	const appService = new AppService(db);
	const tokenService = new TokenService(db);

	const activeConfigManager = new ActiveConfigManager(db);

	let config: IApiConfig | undefined;
	let dataVersionState: DataVersionState;
	const refreshMenu = async () => {
		dataVersionState = await getDataVersionState(db, targetDataVersion, 'api.meta',
		['api.users', 'api.apps', 'api.tokens', 'api.userRelations', 'api.postings', 'api.storageFiles'],
		{ enableOldMetaCollection: true });


		config = {
			appSecretKey: await activeConfigManager.getItem('api', 'appSecretKey'),
			hostToken: {
				scopes: await activeConfigManager.getItem('api', 'hostToken.scopes')
			}
		};
		try {
			verifyApiConfig(config);
		}
		catch {
			// if config is invalid, set undefined
			config = undefined;
		}
	};
	await refreshMenu();

	const menu = new ConsoleMenu('API Setup Menu');
	menu.add('exit setup', () => true, (ctx) => {
		ctx.closeMenu();
	});
	menu.add('initialize (register root app and root user)', () => true, async (ctx) => {
		if (dataVersionState != DataVersionState.needInitialization) {
			const allowClear = await question('(!) are you sure you want to REMOVE ALL COLLECTIONS and ALL DOCUMENTS in target database? (y/n) > ');
			if (!allowClear) {
				return;
			}

			async function clean(collection: string) {
				await db.remove(collection, {});
				log(`cleaned ${collection} collection.`);
			}

			await clean('api.meta');
			await clean('api.config');
			await clean('api.apps');
			await clean('api.tokens');
			await clean('api.users');
			await clean('api.userRelations');
			await clean('api.postings');
			await clean('api.storageFiles');
		}

		let appName = await inputLine('app name(default: Frost Web) > ');
		if (appName == '') appName = 'Frost Web';

		const userDoc = await userService.create('frost', null, 'Frost公式', 'オープンソースSNS Frostです。', { root: true });
		log('root user created.');

		await appService.create(appName, userDoc, userDoc.description, AuthScopes.toArray().map(s => s.id), { root: true });
		log('root app created.');

		const appSecretKey = uid(128);
		await activeConfigManager.setItem('api', 'appSecretKey', appSecretKey);
		log('appSecretKey configured:', appSecretKey);

		const hostTokenScopes = ["user.read", "app.read", "app.host", "auth.host", "user.create", "user.delete"];
		await activeConfigManager.setItem('api', 'hostToken.scopes', hostTokenScopes);
		log('hostToken.scopes configured.');

		await db.create('api.meta', { type: 'dataFormat', value: targetDataVersion });

		await refreshMenu();
	});
	menu.add('generate or get token for authorization host', () => (dataVersionState == DataVersionState.ready && config != null), async (ctx) => {
		const rootUser = await db.find('api.users', { root: true });
		let rootApp = await db.find('api.apps', { root: true });
		if (rootApp) {
			let hostToken = await db.find('api.tokens', { host: true });

			if (!hostToken) {
				if (!config) {
					console.log('api config is not found.');
					return;
				}
				const scopes = config!.hostToken.scopes;

				hostToken = await tokenService.create(rootApp, rootUser, scopes, true);
				log('host token created:', hostToken);
			}
			else {
				log('host token found:', hostToken);
			}
		}

		await refreshMenu();
	});
	menu.add('migrate from old data formats', () => (dataVersionState == DataVersionState.needMigration), async (ctx) => {
		let dataVersion = await db.find('api.meta', { type: 'dataFormat' });
		if (!dataVersion) {
			dataVersion = await db.find('meta', { type: 'dataFormat' });
		}
		const migrator = await Migrator.FromPatchFunc(migration, db);
		await migrator.migrate(dataVersion.value, targetDataVersion);

		await refreshMenu();
	});

	return menu;
}
