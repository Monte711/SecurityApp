// Test script to verify UI data flow for Windows Update
// This script simulates the data flow from API to UI components

// Simulate API response
const apiResponse = {
    "security": {
        "defender": {
            "realtime_enabled": true,
            "antivirus_enabled": true,
            "engine_version": "неизвестно",
            "signature_age_days": 1,
            "permission": null
        },
        "firewall": {
            "domain": {
                "enabled": true,
                "default_inbound": "Block"
            },
            "private": {
                "enabled": false,
                "default_inbound": "NotConfigured"
            },
            "public": {
                "enabled": true,
                "default_inbound": "Block"
            },
            "permission": null
        }
    },
    "windows_update": {
        "last_update_date": "2025-08-27T21:00:00Z",
        "update_service_status": "Running",
        "pending_updates": 2,
        "permission": "granted",
        "error_message": null
    }
};

console.log("=== API Response ===");
console.log("windows_update section:", JSON.stringify(apiResponse.windows_update, null, 2));

// Simulate SecurityAdapter.normalize()
function normalizeSecurityData(rawData) {
    const securitySource = rawData.security || {};
    
    return {
        defender: normalizeDefender(securitySource.defender),
        firewall: normalizeFirewall(securitySource.firewall),
        windows_update: normalizeWindowsUpdate(rawData.windows_update)
    };
}

function normalizeWindowsUpdate(windowsUpdate) {
    if (!windowsUpdate || typeof windowsUpdate !== 'object') {
        return {
            last_update_date: undefined,
            update_service_status: 'unknown',
            pending_updates: undefined,
            permission: 'access_denied',
            error_message: undefined
        };
    }

    return {
        last_update_date: safeString(windowsUpdate.last_update_date, undefined),
        update_service_status: safeString(windowsUpdate.update_service_status, 'unknown'),
        pending_updates: typeof windowsUpdate.pending_updates === 'number' ? windowsUpdate.pending_updates : undefined,
        permission: windowsUpdate.permission || 'no_data',
        error_message: safeString(windowsUpdate.error_message, undefined)
    };
}

function safeString(value, fallback) {
    return (typeof value === 'string' && value.trim().length > 0) ? value : fallback;
}

function normalizeDefender(defender) {
    if (!defender || typeof defender !== 'object') {
        return {
            realtime_enabled: undefined,
            antivirus_enabled: undefined,
            permission: 'access_denied'
        };
    }
    return {
        realtime_enabled: typeof defender.realtime_enabled === 'boolean' ? defender.realtime_enabled : undefined,
        antivirus_enabled: typeof defender.antivirus_enabled === 'boolean' ? defender.antivirus_enabled : undefined,
        permission: defender.permission || undefined
    };
}

function normalizeFirewall(firewall) {
    // Simplified for testing
    return firewall || {};
}

console.log("\n=== SecurityAdapter.normalize() ===");
const normalizedSecurity = normalizeSecurityData(apiResponse);
console.log("Normalized windows_update:", JSON.stringify(normalizedSecurity.windows_update, null, 2));

// Simulate SecurityDataNormalizer.getWindowsUpdateStatus()
function getWindowsUpdateStatus(data) {
    const updateInfo = data.windows_update || {};
    
    let status = 'unknown';
    let details = {};
    let recommendations = [];

    // Анализ статуса службы обновлений
    if (updateInfo.update_service_status === 'Running') {
        status = 'enabled';
        details.service = 'Служба обновлений запущена';
    } else if (updateInfo.update_service_status === 'Stopped') {
        status = 'disabled';
        details.service = 'Служба обновлений остановлена';
        recommendations.push('Запустите службу Windows Update');
    } else {
        status = 'no_data';
        details.service = 'Статус службы неизвестен';
    }

    // Обработка даты последнего обновления
    if (updateInfo.last_update_date) {
        try {
            const lastUpdate = new Date(updateInfo.last_update_date);
            const now = new Date();
            const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
            
            details.lastUpdate = `Последнее обновление: ${lastUpdate.toLocaleDateString('ru-RU')}`;
            details.daysSinceUpdate = `${daysSinceUpdate} дней назад`;
            
            if (daysSinceUpdate > 30) {
                if (status === 'enabled') status = 'disabled';
                recommendations.push('Критично! Система не обновлялась более 30 дней');
            } else if (daysSinceUpdate > 7) {
                recommendations.push('Проверьте наличие обновлений безопасности');
            }
        } catch (e) {
            details.lastUpdate = 'Некорректная дата последнего обновления';
        }
    } else {
        details.lastUpdate = 'Дата последнего обновления недоступна';
        recommendations.push('Проверьте историю обновлений системы');
    }

    // Обработка ожидающих обновлений
    if (updateInfo.pending_updates !== null && updateInfo.pending_updates !== undefined) {
        if (updateInfo.pending_updates > 0) {
            details.pendingUpdates = `Ожидают установки: ${updateInfo.pending_updates} обновлений`;
            recommendations.push(`Установите ${updateInfo.pending_updates} ожидающих обновлений`);
            if (status === 'enabled') status = 'disabled';
        } else {
            details.pendingUpdates = 'Нет ожидающих обновлений';
        }
    } else {
        details.pendingUpdates = 'Данные об ожидающих обновлениях недоступны';
    }

    // Обработка уровня доступа
    if (updateInfo.permission) {
        details.permission = `Уровень доступа: ${updateInfo.permission}`;
        if (updateInfo.permission === 'denied') {
            if (status !== 'disabled') status = 'access_denied';
            recommendations.push('Запустите агент с правами администратора для получения полной информации');
        }
    }

    return {
        status,
        displayName: 'Обновления Windows',
        description: getStatusDescription(status, 'windowsUpdate'),
        source: 'Agent',
        lastUpdated: new Date().toISOString(),
        details,
        recommendations
    };
}

function getStatusDescription(status, module) {
    const descriptions = {
        enabled: {
            windowsUpdate: 'Система обновлений работает корректно'
        },
        disabled: {
            windowsUpdate: 'Проблемы с обновлениями - система уязвима'
        },
        no_data: {
            windowsUpdate: 'Данные об обновлениях Windows недоступны'
        },
        access_denied: {
            windowsUpdate: 'Нет прав для получения данных об обновлениях'
        },
        unknown: {
            windowsUpdate: 'Неизвестное состояние обновлений Windows'
        }
    };

    return descriptions[status]?.[module] || 'Неизвестное состояние';
}

console.log("\n=== SecurityDataNormalizer.getWindowsUpdateStatus() ===");
const windowsUpdateStatus = getWindowsUpdateStatus(apiResponse);
console.log("Final status object:", JSON.stringify(windowsUpdateStatus, null, 2));

console.log("\n=== SUMMARY ===");
console.log("Status:", windowsUpdateStatus.status);
console.log("Display name:", windowsUpdateStatus.displayName);
console.log("Description:", windowsUpdateStatus.description);
console.log("Details:", JSON.stringify(windowsUpdateStatus.details, null, 2));
console.log("Recommendations:", windowsUpdateStatus.recommendations);
