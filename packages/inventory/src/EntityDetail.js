import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import {
    Title,
    Grid,
    GridItem,
    Card,
    CardBody,
    CardHeader,
    SplitItem,
    Split,
    Dropdown,
    DropdownItem,
    DropdownPosition,
    DropdownToggle,
    Button,
    EmptyState,
    EmptyStateVariant,
    EmptyStateIcon,
    EmptyStateBody
} from '@patternfly/react-core';
import { Skeleton, SkeletonSize, DateFormat, CullingInformation } from '@redhat-cloud-services/frontend-components';
import { CubesIcon } from '@patternfly/react-icons';
import get from 'lodash/get';
import { connect } from 'react-redux';
import ApplicationDetails from './ApplicationDetails';
import { editDisplayName, editAnsibleHost, loadEntity, deleteEntity } from './redux/actions';
import TagWithDialog from './TagWithDialog';
import TagsModal from './TagsModal';
import DeleteModal from '.';
import { addNotification } from '@redhat-cloud-services/frontend-components-notifications';
import RouterParams from '@redhat-cloud-services/frontend-components-utilities/files/RouterParams';

class EntityDetails extends Component {
    state = {
        isOpen: false,
        isDisplayNameModalOpen: false,
        isAnsibleHostModalOpen: false,
        isModalOpen: false
    };

    getFact = (path) => {
        const { entity } = this.props;
        return get(entity, path, undefined);
    }

    toggleActions = (collapsed) => {
        this.setState({
            isOpen: collapsed
        });
    }

    onSelect = () => {
        this.setState({
            isOpen: !this.state.isOpen
        });
    };

    handleModalToggle = () => {
        this.setState({
            isModalOpen: !this.state.isModalOpen
        });
    };

    redirectToInventoryList = (id) => {
        const { match: { url }, history } = this.props;
        history.push(url.replace(new RegExp(`${[ id ]}.*`, 'g'), ''));
    }

    generateTop = () => {
        const { entity, loaded, actions, deleteEntity, addNotification } = this.props;
        const { isOpen } = this.state;
        const inventoryActions = [{ onClick: this.handleModalToggle, title: 'Delete' }, ... actions || [] ];
        return (
            <Split className="ins-c-inventory__detail--header">
                <SplitItem isFilled>
                    {
                        loaded ?
                            <Title size='2xl'>{ entity && entity.display_name }</Title> :
                            <Skeleton size={ SkeletonSize.md } />
                    }
                </SplitItem>
                {
                    <SplitItem>
                        {
                            loaded ?
                                inventoryActions && inventoryActions.length > 0 && <Dropdown
                                    onSelect={ this.onSelect }
                                    toggle={ <DropdownToggle onToggle={ this.toggleActions }>Actions</DropdownToggle> }
                                    isOpen={ isOpen }
                                    position={ DropdownPosition.right }
                                    dropdownItems={ [ ...(inventoryActions ?
                                        inventoryActions.map((action, key) => (
                                            <DropdownItem
                                                key={ action.key || key }
                                                component="button"
                                                onClick={ (event) => action.onClick(event, action, action.key || key) }
                                            >
                                                { action.title }
                                            </DropdownItem>)
                                        ) : []) ] }
                                /> :
                                <Skeleton size={ SkeletonSize.xl } />
                        }
                    </SplitItem>
                }
                { this.state.isModalOpen && (
                    <DeleteModal
                        handleModalToggle={this.handleModalToggle}
                        isModalOpen={this.state.isModalOpen}
                        currentSytems={entity}
                        onConfirm={() => {
                            addNotification({
                                id: 'remove-initiated',
                                variant: 'warning',
                                title: 'Delete operation initiated',
                                description: `Removal of ${entity.display_name} started.`,
                                dismissable: false
                            });
                            deleteEntity(
                                [ entity.id ],
                                entity.display_name,
                                () => this.redirectToInventoryList(entity.id)
                            );
                            this.handleModalToggle(false);
                        }}
                    />)}
            </Split>
        );
    }

    generateFacts = () => {
        const { loaded } = this.props;
        return (
            <Grid className="ins-entity-facts">
                <GridItem md={ 6 }>
                    <div>
                        <span>
                            UUID:
                        </span>
                        <span>
                            {
                                loaded ?
                                    this.getFact(`id`) || ' ' :
                                    <Skeleton size={ SkeletonSize.md } />
                            }
                        </span>
                    </div>
                    <div>
                        <span>
                            Last seen:
                        </span>
                        <span>
                            {
                                loaded ?
                                    (
                                        CullingInformation ? <CullingInformation
                                            culled={this.getFact('culled_timestamp')}
                                            staleWarning={this.getFact('stale_warning_timestamp')}
                                            stale={this.getFact('stale_timestamp')}
                                        >
                                            <DateFormat date={this.getFact('updated')} type="exact" />
                                        </CullingInformation> : <DateFormat date={this.getFact('updated')} type="exact" />
                                    ) :
                                    <Skeleton size={ SkeletonSize.sm } />
                            }
                        </span>
                    </div>
                </GridItem>
            </Grid>
        );
    }

    entityTopBar = () => {
        const { loaded, entity } = this.props;
        return (
            <Fragment>
                { this.generateTop() }
                { this.generateFacts() }
                {
                    loaded ?
                        <TagWithDialog count={ entity && entity.tags && entity.tags.length } systemId={ entity && entity.id } /> :
                        <Skeleton size={ SkeletonSize.sm }>&nbsp;</Skeleton>
                }
                <TagsModal />
            </Fragment>
        );
    }

    render() {
        const { useCard, loaded, entity, match } = this.props;

        return (
            <div className="ins-entity-detail">
                { useCard ?
                    <Card>
                        <CardHeader>
                            { this.generateTop() }
                        </CardHeader>
                        <CardBody>
                            { this.generateFacts() }
                        </CardBody>
                    </Card> :
                    loaded && !entity ? (
                        <EmptyState variant={EmptyStateVariant.full}>
                            <EmptyStateIcon icon={CubesIcon} />
                            <Title headingLevel="h5" size="lg">
                                System not found
                            </Title>
                            <EmptyStateBody>
                                System with ID {match.params.inventoryId} does not exist
                            </EmptyStateBody>
                            <Button
                                variant="primary"
                                onClick={() => this.redirectToInventoryList(match.params.inventoryId)}
                            >
                                Back to previous pages
                            </Button>
                        </EmptyState>
                    ) : this.entityTopBar()
                }
                <ApplicationDetails />
            </div>
        );
    }
}

EntityDetails.propTypes = {
    actions: PropTypes.arrayOf(PropTypes.shape({
        title: PropTypes.node,
        onClick: PropTypes.func,
        key: PropTypes.string
    })),
    entity: PropTypes.object,
    history: PropTypes.any,
    loaded: PropTypes.bool.isRequired,
    match: PropTypes.any,
    tagCount: PropTypes.number,
    useCard: PropTypes.bool,
    setAnsibleHost: PropTypes.func,
    setDisplayName: PropTypes.func,
    deleteEntity: PropTypes.func,
    addNotification: PropTypes.func
};

EntityDetails.defualtProps = {
    actions: [],
    entity: {},
    useCard: false,
    setDisplayName: () => undefined,
    setAnsibleHost: () => undefined
};

function mapDispatchToProps(dispatch) {
    const reloadWrapper = (id, event) => {
        event.payload.then(data => {
            dispatch(loadEntity(id, { hasItems: true }));
            return data;
        });

        return event;
    };

    const onActionFinish = (event, callback) => {
        event.payload.then(callback);
        return event;
    };

    return {
        addNotification: (payload) => dispatch(addNotification(payload)),
        deleteEntity: (systems, displayName, callback) => dispatch(onActionFinish(deleteEntity(systems, displayName), callback)),
        setDisplayName: (id, value) => {
            dispatch(reloadWrapper(id, editDisplayName(id, value)));
        },
        setAnsibleHost: (id, value) => {
            dispatch(reloadWrapper(id, editAnsibleHost(id, value)));
        }
    };
}

export default RouterParams(connect(({ entityDetails }) => ({ ...entityDetails }), mapDispatchToProps)(EntityDetails));
