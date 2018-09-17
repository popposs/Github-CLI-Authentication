const chalk = require('chalk')
const figlet = require('figlet')
const clipboardy = require('clipboardy')
const octokit = require('@octokit/rest')()
const Configstore = require('configstore')
const _ = require('lodash')
const CLI = require('clui')
const Spinner = CLI.Spinner

const Enquirer = require('enquirer')
const enquirer = new Enquirer();
const Password = require('prompt-password');
const Input = require('prompt-input');
const List = require('prompt-list');
const Checkbox = require('prompt-checkbox');

const query_github_credentials = async () => {
	let username_prompt = new Input({
		message: 'Enter your username:',
		name: 'username'
	})

	let password_prompt = new Password({
		type: 'password',
		message: 'Enter your password:',
		name: 'password'
	})

	let username = ''
	let password = ''

	while (!username) {
		username = await username_prompt.run()
	}

	while(!password) {
		password = await password_prompt.run()
	}

	return { username, password }
}

const get_github_credentials = async () => {
	const credentials = await query_github_credentials()
	octokit.authenticate(
		_.extend({ type: 'basic' }, credentials)
	)
}

const register_new_token = async (scopes_, note_) => {
	const status = new Spinner('Authenticating, please wait...')
	status.start()

	try {
		const response = await octokit.authorization.create({
			scopes: scopes_,
			note: note_
		})

		const token = response.data.token
		if (token) {
			return token
		} else {
			throw new Error('Missing Token', 'GitHub token was not found in the response')
		}
	} catch (err) {
		throw err
	} finally {
		status.stop()
	}
}

const get_note = async () => {
	let note_prompt = new Input({
		message: 'Enter your note for the token:',
		name: 'note'
	})

	return await note_prompt.run()
}

const get_scopes = async () => {
	let scope_prompt = new Checkbox({
		name: 'scopes',
		message: 'What are the scopes for this token?',
		choices: {
			'repo' : ['repo:status', 'repo_deployment', 'public_repo', 'repo:invite'],
			'write' : ['write:org', 'read:org'],
			'public_key' : ['write:public_key', 'read:public_key'],
			'repo_hook' : ['write:repo_hook', 'read:repo_hook'],
			'admin' : ['admin:org_hook'],
			'gist' : ['gist'],
			'notifications' : ['notifications'],
			'user' : ['read:user', 'user:email', 'user:follow'],
			'delete_repo' : ['delete_repo'],
			'write:discussion' : ['read:discussion'],
			'admin:gpg_key' : ['write:gpg_key', 'read:gpg_key']
		}
	})

	return await scope_prompt.run()
}

const two_factor_auth = async (scopes, note) => {
	let two_factor_prompt = new Input({
		message: 'Enter your 2-factor auth code:',
		name: 'two_factor_code'
	})

	const two_factor_code = await two_factor_prompt.run()

	return register_two_auth_token(
		two_factor_code, scopes, note
	)
}

const register_two_auth_token = async (two_factor_code, scopes_, note_) => {
	const status = new Spinner('Authenticating you, please wait...')
	status.start()

	try {
		const response = await octokit.authorization.create({
			scopes: scopes_,
			note: note_,
			headers: { 'X-GitHub-OTP': two_factor_code }
		})
		const token = response.data.token
		if (token) {
			conf.set('github.token', token)
		} else {
			throw new Error('Missing Token', 'GitHub token was not found in the response')
		}
	} catch (err) {
		throw err
	} finally {
		status.stop()
	}

	return token
}

const run = async () => {
	await get_github_credentials()
	const token = ''
	const scopes = await get_scopes()
	const note = await get_note()

	try {
		token = await register_new_token(scopes, note)
	} catch (error) {
		const error_message = JSON.parse(error).message
		if (error_message == 'Must specify two-factor authentication OTP code.') {
			token = await two_factor_auth(scopes, note)
		}
	}

	clipboardy.writeSync(token)
	console.log( chalk.green( '😆 Token copied to clipboard!' ))
}

console.clear()
console.log(
	chalk.green(
		figlet.textSync('Generate Github Token', {font: 'small', horizontalLayout: 'default', verticalLayout: 'default'})
	)
)

run()
