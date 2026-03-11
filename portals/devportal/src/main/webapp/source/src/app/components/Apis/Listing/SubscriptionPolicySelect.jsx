/*
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';
import { styled } from '@mui/material/styles';
import PropTypes from 'prop-types';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { FormattedMessage } from 'react-intl';
import { useTheme } from '@mui/material';
import Api from 'AppData/api';
import { ScopeValidation, resourceMethods, resourcePaths } from '../../Shared/ScopeValidation';
import {
    getSubscriptionOptionsRenderer,
    isSubscriptionOptionSelectionComplete,
} from '../Details/Credentials/federated/CredentialRendererRegistry';

const PREFIX = 'SubscriptionPolicySelectLegacy';

const classes = {
    root: `${PREFIX}-root`,
    buttonGap: `${PREFIX}-buttonGap`,
    federatedButton: `${PREFIX}-federatedButton`,
    select: `${PREFIX}-select`,
};

const Root = styled('div')((
    {
        theme,
    },
) => ({
    [`&.${classes.root}`]: {
        display: 'flex',
    },

    [`& .${classes.buttonGap}`]: {
        background: theme.palette.grey[300],
        marginLeft: 20,
        '& span span': {
            color: theme.palette.getContrastText(theme.palette.primary.main),
        },
    },
    [`& .${classes.federatedButton}`]: {
        marginLeft: 'auto !important',
    },

    [`& .${classes.select}`]: {
        width: 100,
    },
}));

/**
 * @class SubscriptionPolicySelectLegacy
 * @extends {React.Component}
 */
class SubscriptionPolicySelectLegacy extends React.Component {
    /**
     * Create instance of SubscriptionPolicySelectLegacy
     * @param {JSON} props Props pass from the parent.
     * @returns {void}
     */
    constructor(props) {
        super(props);
        this.state = {
            selectedPolicy: null,
            subscriptionOptions: null,
            selectedOption: null,
            optionsLoading: false,
            optionsDialogOpen: false,
        };
    }

    /**
     * Calls when component did mount.
     * @returns {void}
     */
    componentDidMount() {
        const { policies, isFederatedApi } = this.props;
        if (!isFederatedApi) {
            this.setState({ selectedPolicy: policies[0] });
        }
    }

    openFederatedOptionsDialog = () => {
        const { apiId } = this.props;
        this.setState({
            optionsDialogOpen: true,
            optionsLoading: true,
            subscriptionOptions: null,
            selectedOption: null,
        });
        new Api().getApiSubscriptionSupport(apiId)
            .then((response) => {
                const supportInfo = response?.body || {};
                this.setState({ subscriptionOptions: supportInfo.subscriptionOptions || null });
            })
            .catch(() => {
                this.setState({ subscriptionOptions: null });
            })
            .finally(() => this.setState({ optionsLoading: false }));
    };

    closeFederatedOptionsDialog = () => {
        this.setState({
            optionsDialogOpen: false,
            selectedOption: null,
            optionsLoading: false,
        });
    };

    /**
     * renders method.
     * @returns {JSX} Policy selection component.
     */
    render() {
        const {
            policies, apiId, handleSubscribe, applicationId, isFederatedApi,
        } = this.props;
        const {
            selectedPolicy, optionsLoading, subscriptionOptions, selectedOption, optionsDialogOpen,
        } = this.state;

        const optionsRenderer = getSubscriptionOptionsRenderer(subscriptionOptions?.schemaName);
        const hasOptions = !!(subscriptionOptions && subscriptionOptions.body && optionsRenderer);
        const requiresSelection = hasOptions && !isSubscriptionOptionSelectionComplete(
            subscriptionOptions?.schemaName,
            subscriptionOptions?.body,
            selectedOption,
        );

        return (
            policies
            && (
                <Root className={classes.root}>
                    {isFederatedApi ? (
                        <div />
                    ) : (
                        <Autocomplete
                            id='policy-select'
                            disableClearable
                            options={policies}
                            value={selectedPolicy}
                            onChange={(e, value) => {
                                this.setState({ selectedPolicy: value });
                            }}
                            style={{ width: 150 }}
                            renderInput={(params) => (<TextField size='small' variant='standard' {...params} />)}
                            renderOption={(props, policy) => (
                                <MenuItem
                                    {...props}
                                    value={policy}
                                    key={policy}
                                    id={'policy-select-' + policy}
                                >
                                    {policy}
                                </MenuItem>
                            )}
                        />
                    )}
                    <ScopeValidation
                        resourcePath={resourcePaths.SUBSCRIPTIONS}
                        resourceMethod={resourceMethods.POST}
                    >
                        <Button
                            variant='contained'
                            size='small'
                            color='grey'
                            className={isFederatedApi
                                ? `${classes.buttonGap} ${classes.federatedButton}`
                                : classes.buttonGap}
                            onClick={() => {
                                if (isFederatedApi) {
                                    this.openFederatedOptionsDialog();
                                } else {
                                    handleSubscribe(applicationId, apiId, selectedPolicy);
                                }
                            }}
                            id={'policy-subscribe-btn-' + apiId}
                        >
                            <FormattedMessage
                                defaultMessage='Subscribe'
                                id='Apis.Listing.SubscriptionPolicySelect.subscribe'
                            />
                        </Button>
                    </ScopeValidation>
                    {isFederatedApi && (
                        <Dialog open={optionsDialogOpen} onClose={this.closeFederatedOptionsDialog} maxWidth='sm' fullWidth>
                            <DialogTitle>
                                <FormattedMessage
                                    id='Applications.Details.Subscriptions.federated.options.title'
                                    defaultMessage='Select Subscription Options'
                                />
                            </DialogTitle>
                            <DialogContent>
                                {optionsLoading && <CircularProgress size={20} />}
                                {!optionsLoading && hasOptions && React.createElement(optionsRenderer, {
                                    body: subscriptionOptions.body,
                                    selectedOption,
                                    onSelect: (value) => this.setState({ selectedOption: value }),
                                })}
                                {!optionsLoading && !hasOptions && (
                                    <Typography variant='body2'>
                                        <FormattedMessage
                                            id='Applications.Details.Subscriptions.federated.options.none'
                                            defaultMessage='No additional subscription options are required.'
                                        />
                                    </Typography>
                                )}
                                {!optionsLoading && requiresSelection && (
                                    <Typography variant='caption' color='error'>
                                        <FormattedMessage
                                            id='Applications.Details.Subscriptions.select.subscription.option'
                                            defaultMessage='Select a subscription option to continue.'
                                        />
                                    </Typography>
                                )}
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={this.closeFederatedOptionsDialog} color='grey'>
                                    <FormattedMessage
                                        id='Applications.Details.Subscriptions.cancel'
                                        defaultMessage='Cancel'
                                    />
                                </Button>
                                <Button
                                    variant='contained'
                                    color='primary'
                                    onClick={() => {
                                        let wrappedSelectedOption = null;
                                        if (selectedOption && subscriptionOptions) {
                                            wrappedSelectedOption = JSON.stringify({
                                                schemaName: subscriptionOptions.schemaName,
                                                body: selectedOption,
                                            });
                                        }
                                        handleSubscribe(applicationId, apiId, null, wrappedSelectedOption, true);
                                        this.closeFederatedOptionsDialog();
                                    }}
                                    disabled={optionsLoading || requiresSelection}
                                >
                                    <FormattedMessage
                                        defaultMessage='Subscribe'
                                        id='Apis.Listing.SubscriptionPolicySelect.subscribe'
                                    />
                                </Button>
                            </DialogActions>
                        </Dialog>
                    )}
                </Root>
            )
        );
    }
}

SubscriptionPolicySelectLegacy.propTypes = {
    classes: PropTypes.shape({}).isRequired,
    policies: PropTypes.shape({}).isRequired,
    apiId: PropTypes.string.isRequired,
    handleSubscribe: PropTypes.func.isRequired,
    applicationId: PropTypes.string.isRequired,
    isFederatedApi: PropTypes.bool,
};

SubscriptionPolicySelectLegacy.defaultProps = {
    isFederatedApi: false,
};

function SubscriptionPolicySelect(props) {
    const {
        key, policies, apiId, handleSubscribe, applicationId, isFederatedApi,
    } = props;
    const theme = useTheme();
    return (
        <SubscriptionPolicySelectLegacy
            key={key}
            policies={policies}
            apiId={apiId}
            handleSubscribe={handleSubscribe}
            applicationId={applicationId}
            isFederatedApi={isFederatedApi}
            theme={theme}
        />
    );
}

export default (SubscriptionPolicySelect);
