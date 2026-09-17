import React from 'react';
import { isAuthenticated } from '../../utils/auth';
import { Navigate } from 'react-router-dom';
import DocumentsSummary from '../../components/Dashboard/DocumentsSummary';

const Main: React.FC = () => {
    if (!isAuthenticated()) {
        return <Navigate to="/auth/signin" />
    }

    return (
        <DocumentsSummary />
    );
};

export default Main;
