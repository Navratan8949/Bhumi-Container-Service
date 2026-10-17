import { createSlice } from "@reduxjs/toolkit";
const initialState = { user: null, hydrated: false };
const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setUser: (state, action) => {
            state.user = action.payload;
            state.hydrated = true;
        },
        setHydrated: (state) => { state.hydrated = true; },
        logout: (state) => { state.user = null; state.hydrated = true; },
    },
});
export const { setUser, setHydrated, logout } = authSlice.actions;
export default authSlice.reducer;
