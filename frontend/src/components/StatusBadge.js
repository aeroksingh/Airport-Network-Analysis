    import React from 'react';

    const flightStatusMap = {
    Scheduled: 'badge-blue',
    Boarding:  'badge-cyan',
    Departed:  'badge-green',
    Arrived:   'badge-purple',
    Cancelled: 'badge-red',
    Delayed:   'badge-yellow',
    };

    const gateStatusMap = {
    Available:   'badge-green',
    Occupied:    'badge-yellow',
    Maintenance: 'badge-red',
    Closed:      'badge-gray',
    };

    const flightStatusIcon = {
    Scheduled: '🕐',
    Boarding:  '🚶',
    Departed:  '✈',
    Arrived:   '🛬',
    Cancelled: '✕',
    Delayed:   '⏳',
    };

    export function FlightStatusBadge({ status }) {
    return (
        <span className={`badge ${flightStatusMap[status] || 'badge-gray'}`}>
        {flightStatusIcon[status]} {status}
        </span>
    );
    }

    export function GateStatusBadge({ status }) {
    return (
        <span className={`badge ${gateStatusMap[status] || 'badge-gray'}`}>
        {status}
        </span>
    );
    }

    export function CheckInBadge({ checkedIn }) {
    return checkedIn ? (
        <span className="badge badge-green">✓ Checked In</span>
    ) : (
        <span className="badge badge-gray">Pending</span>
    );
    }