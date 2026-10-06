import api from "./api";

import type{
    OnboardingProgress,
}from "../types/onboarding";

export async function fetchOnboardingProgress():
    Promise<OnboardingProgress>
{
    const response=
        await api.get(
            "/api/onboarding/progresso"
        );

    return response.data.data;
}
