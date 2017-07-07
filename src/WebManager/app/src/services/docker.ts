﻿import axios from "axios"
import { AxiosRequestConfig, AxiosResponse, CancelToken, CancelTokenSource } from "axios";
import { Promise } from "es6-promise";
import { CredentialService, RegistryCredentials } from "./credential";

export class Docker {
    private credService: CredentialService = new CredentialService();
    private registryEndpoint: string;

    constructor(public registryName: string) {
        // this.registryEndpoint = "https://" + this.registryName;
        this.registryEndpoint = null;
    }

    createCancelToken(): CancelTokenSource {
        return axios.CancelToken.source();
    }

    // note: we can't use the Link HTTP header yet because we need to forward requests
    // through the server in order to satisfy CORS policies
    getRepos(maxResults: number | null = 10, last: string = null, cancel: CancelToken = null):
        Promise<{ repositories: string[], httpLink: string }> {
        let cred: RegistryCredentials = this.credService.getRegistryCredentials(this.registryName);
        if (!cred) {
            return Promise.resolve({ repositories: null, httpLink: null });
        }

        let config: AxiosRequestConfig = {
            cancelToken: cancel,
            baseURL: this.registryEndpoint,
            params: {},
            headers: {
                "Registry": this.registryName,
                "Authorization": "Basic " + cred.basicAuth
            }
        };

        if (maxResults != null) {
            config.params.n = maxResults;
        }
        if (last != null) {
            config.params.last = last;
        }

        return axios.get("/v2/_catalog", config)
            .then((r: AxiosResponse) => {
                return { repositories: r.data.repositories, httpLink: r.headers.link }
            }).catch((e: any) => {
                if (axios.isCancel(e)) {
                    return null;
                }
                else {
                    return Promise.reject(e);
                }
            });
    }

    getManifestHeaders(repo: string, tag: string, cancel: CancelToken = null):
        Promise<{ manifest: string }> {
        let cred: RegistryCredentials = this.credService.getRegistryCredentials(this.registryName);
        if (!cred) {
            return Promise.resolve({ manifest: null });
        }

        let config: AxiosRequestConfig = {
            cancelToken: cancel,
            baseURL: this.registryEndpoint,
            params: {},
            headers: {
                "Registry": this.registryName,
                "Access-Control-Expose-Headers": "X-Ms-Request-Id",
                "Accept": "application/vnd.docker.distribution.manifest.v2+json; 0.6, " +
                "application/vnd.docker.distribution.manifest.v1+json; 0.5",
                "Authorization": "Basic " + cred.basicAuth
            }
        };

        return axios.get(`/v2/${repo}/manifests/${tag}`, config)
            .then((r: AxiosResponse) => {
                return { manifest: r.headers }
            }).catch((e: any) => {
                if (axios.isCancel(e)) {
                    return null;
                }
                else {
                    return Promise.reject(e);
                }
            });
    }

    getManifest(repo: string, tag: string, cancel: CancelToken = null):
        Promise<{ manifest: string }> {
        let cred: RegistryCredentials = this.credService.getRegistryCredentials(this.registryName);
        if (!cred) {
            return Promise.resolve({ manifest: null });
        }

        let config: AxiosRequestConfig = {
            cancelToken: cancel,
            baseURL: this.registryEndpoint,
            params: {},
            headers: {
                "Registry": this.registryName,
                "Accept": "application/vnd.docker.distribution.manifest.v2+json; 0.6, " +
                "application/vnd.docker.distribution.manifest.v1+json; 0.5," +
                "application/vnd.docker.distribution.manifest.list.v2+json; 0.7",
                "Authorization": "Basic " + cred.basicAuth
            }
        };

        return axios.get(`/v2/${repo}/manifests/${tag}`, config)
            .then((r: AxiosResponse) => {



                return { manifest: r.data }
            }).catch((e: any) => {
                if (axios.isCancel(e)) {
                    return null;
                }
                else {
                    return Promise.reject(e);
                }
            });
    }

    putMultiArch(repo: string, tag: string, cancel: CancelToken = null, manifest: string):
        Promise<{ rBody: string }> {

        let cred: RegistryCredentials = this.credService.getRegistryCredentials(this.registryName);
        if (!cred) {
            return Promise.resolve({ rBody: null });
        }

        let config: AxiosRequestConfig = {
            cancelToken: cancel,
            baseURL: this.registryEndpoint,
            params: {},
            headers: {
                "Registry": this.registryName,
                "Content-Type": "application/JSON",
                "Authorization": "Basic " + cred.basicAuth
            }
        };

        return axios.put(`/v2/${repo}/manifests/${tag}`, manifest, config)
            .then((r: AxiosResponse) => {
                return { rBody: r.status }
            }).catch((e: any) => {
                if (axios.isCancel(e)) {
                    return null;
                }
                else {
                    return Promise.reject(e);
                }
            });
    }

    // for whatever reason, the docker registry doesn't respect the tag pagination API...
    // this will just return all the tags at once
    getTagsForRepo(repo: string, maxResults: number | null = 10, last: string = null, cancel: CancelToken = null):
        Promise<{ tags: string[], httpLink: string }> {
        let cred: RegistryCredentials = this.credService.getRegistryCredentials(this.registryName);
        if (!cred) {
            return Promise.resolve({ tags: null, httpLink: null });
        }

        let config: AxiosRequestConfig = {
            cancelToken: cancel,
            baseURL: this.registryEndpoint,
            params: {},
            headers: {
                "Registry": this.registryName,
                "Authorization": "Basic " + cred.basicAuth
            }
        };

        if (maxResults != null) {
            config.params.n = maxResults;
        }
        if (last != null) {
            config.params.last = last;
        }
        return axios.get(`/v2/${repo}/tags/list`, config)
            .then((r: AxiosResponse) => {
                if (r.data.tags === undefined) {
                    return null;
                }

                return { tags: r.data.tags, httpLink: r.headers.link }
            }).catch((e: any) => {
                if (axios.isCancel(e)) {
                    return null;
                }
                else {
                    return Promise.reject(e);
                }
            });
    }

    tryAuthenticate(cred: RegistryCredentials, cancel: CancelToken = null): Promise<boolean> {
        let config: AxiosRequestConfig = {
            cancelToken: cancel,
            baseURL: this.registryEndpoint,
            headers: {
                "Registry": this.registryName,
                "Authorization": "Basic " + cred.basicAuth
            }
        }

        return axios.get("/v2/", config)
            .then((r: AxiosResponse) => {
                if (r.status === 200) {
                    this.credService.setRegistryCredentials(this.registryName, cred);
                    return true;
                }
                return false;
            })
            .catch((e: any) => {
                if (axios.isCancel(e)) {
                    return false;
                }
                else if (e.response) {
                    let r: AxiosResponse = e.response;
                    if (r.status === 401) {
                        return false;
                    }
                    else {
                        return Promise.reject(e);
                    }
                }
                else {
                    return Promise.reject(e);
                }
            });
    }
}
