# Bhumi Container Service — Frontend RBAC

The frontend now uses a centralized role-based access layer in `src/lib/rbac.js`.

## Roles
- super_admin
- admin
- manager
- accountant
- driver
- vendor

## Enforcement layers
1. Role-specific sidebar/menu
2. Role-specific dashboard
3. Protected routes / direct URL checks
4. Role-specific report visibility
5. Existing resource create/edit/delete permissions
6. Backend remains the final authorization layer and returns 403 for disallowed API operations

## Important
Driver and Vendor currently do not have dedicated self-service operational endpoints in the supplied backend. Their frontend therefore stays intentionally minimal instead of exposing screens that would only fail with 403.

The frontend permission matrix is intentionally narrower than some backend GET permissions so each role sees a focused application rather than every available API resource.
