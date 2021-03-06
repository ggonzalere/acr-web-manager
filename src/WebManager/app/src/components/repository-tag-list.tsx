﻿import * as React from "react";
import { CancelTokenSource } from "axios";
import { Docker } from "../services/docker";

export interface IRepositoryTagListProps {
    service: Docker,
    repositoryName: string,
    collapsable?: boolean,
    onTagClick?: (tag: string) => void,
    onLoadFailure?: (err: any) => void
}

interface IRepositoryTagListState {
    tags: string[],
    showTags: boolean,
    hasMoreTags: boolean,
    error: string
}

export class RepositoryTagList extends React.Component<IRepositoryTagListProps, IRepositoryTagListState> {
    private cancel: CancelTokenSource = null;

    constructor(props: IRepositoryTagListProps) {
        super(props);
        this.state = {
            tags: null,
            showTags: this.props.collapsable ? false : true,
            hasMoreTags: true,
            error: null
        };
    }

    static defaultProps: IRepositoryTagListProps = {
        service: null,
        repositoryName: null,
        collapsable: false,
        onTagClick: null,
        onLoadFailure: null
    };

    componentDidMount(): void {
        this.getMoreTags();
    }

    componentWillUnmount(): void {
        if (this.cancel) {
            this.cancel.cancel("component unmounting");
            this.cancel = null;
        }
    }

    renderTagListItems(): JSX.Element[] {
        if (this.state.tags == null || !this.state.showTags) {
            return null;
        }
        else {
            return this.state.tags.map((tag: string) => (
                <li key={tag}
                    className="ms-ListItem is-selectable repo-list-item-tags-item"
                    onClick={() => { this.props.onTagClick(tag); } }>
                    <i className="ms-Icon ms-Icon--Tag repo-list-item-tags-icon" aria-hidden="true"></i>
                    {tag}
                </li>
            ));
        }
    }

    setRepoTagsVisible(visible: boolean): () => void {
        return () => {
            this.setState({
                showTags: visible
            } as IRepositoryTagListState);
        };
    }

    getMoreTags(): void {
        if (this.cancel) {
            return;
        }
        if (!this.state.hasMoreTags) {
            return;
        }

        let last: string = null;
        if (this.state.tags != null) {
            last = this.state.tags[this.state.tags.length - 1];
        }

        this.cancel = this.props.service.createCancelToken();
        this.props.service.getTagsForRepo(this.props.repositoryName, 10, last, this.cancel.token)
            .then(value => {
                this.cancel = null;
                if (!value) return;

                this.setState((prevState, props) => {
                    if (prevState.tags == null) {
                        prevState.tags = [];
                    }
                    for (let tag of value.tags) {
                        prevState.tags.push(tag);
                    }

                    prevState.hasMoreTags = value.httpLink !== undefined;

                    return prevState;
                });
            }).catch(err => {
                this.cancel = null;
                this.setState({
                    error: err.toString()
                } as IRepositoryTagListState);

                if (this.props.onLoadFailure) {
                    this.props.onLoadFailure(err);
                }
            });
    }

    render(): JSX.Element {
        return (
            <div>
                {
                    this.state.tags == null || !this.props.collapsable ?
                        null
                        :
                        (
                            this.state.showTags ?
                                <span className="ms-ListItem-secondaryText repo-list-item-tags-showhide"
                                    onClick={this.setRepoTagsVisible(false)}>
                                    Hide tags
                                </span>
                                :
                                <span className="ms-ListItem-secondaryText repo-list-item-tags-showhide"
                                    onClick={this.setRepoTagsVisible(true)}>
                                    Show
                                    {" " + this.state.tags.length.toString() + " "}
                                    tags
                                </span>
                        )
                }
                {
                    this.state.tags == null ?
                        (
                            this.state.error == null ?
                                <span className="ms-ListItem-secondaryText">
                                    Loading tags...
                                </span>
                                :
                                <span className="ms-ListItem-secondaryText">
                                    {this.state.error}
                                </span>
                        )
                        :
                        <ul className="ms-List">
                            {this.renderTagListItems()}
                            {
                                this.state.tags == null || !this.state.hasMoreTags ?
                                    null
                                    :
                                    <li key="<showmore>"
                                        className="ms-ListItem is-selectable repo-list-item-tags-item"
                                        onClick={this.getMoreTags.bind(this)}>
                                        Show more tags
                                    </li>
                            }
                        </ul>
                }
            </div>
        );
    }
}