use anchor_lang::prelude::*;

// Constants for maximum string lengths
const MAX_CASE_ID_LEN: usize = 100;
const MAX_DESCRIPTION_LEN: usize = 200;
const MAX_LOCATION_LEN: usize = 100;
const MAX_OFFICER_ID_LEN: usize = 50;
const MAX_ACTION_LEN: usize = 100;
const MAX_HANDLER_LEN: usize = 50;
const MAX_NOTES_LEN: usize = 200;

declare_id!("FPqGhJFbRbR5hMWw3UsLMQ4G7QgJDJFGKZHTRtHg1tXY");

#[program]
pub mod evidence_management {
    use super::*;

    pub fn initialize_access_control(ctx: Context<InitializeAccessControl>) -> Result<()> {
        let access_control = &mut ctx.accounts.access_control;
        access_control.admin = ctx.accounts.authority.key();
        access_control.has_access = true;
        Ok(())
    }

    pub fn grant_access(ctx: Context<GrantAccess>, wallet: Pubkey) -> Result<()> {
        let access_control = &mut ctx.accounts.access_control;
        require!(ctx.accounts.admin_access.admin == ctx.accounts.authority.key(), ErrorCode::InvalidAdmin);
        
        access_control.wallet = wallet;
        access_control.has_access = true;
        access_control.granted_by = ctx.accounts.authority.key();
        Ok(())
    }

    pub fn revoke_access(ctx: Context<RevokeAccess>) -> Result<()> {
        require!(ctx.accounts.admin_access.admin == ctx.accounts.authority.key(), ErrorCode::InvalidAdmin);
        require!(ctx.accounts.access_control.has_access, ErrorCode::NoAccess);
        
        ctx.accounts.access_control.has_access = false;
        Ok(())
    }

    pub fn initialize_crime_scene(
        ctx: Context<InitializeCrimeScene>,
        case_id: String,
        location: String,
    ) -> Result<()> {
        require!(case_id.len() <= MAX_CASE_ID_LEN, ErrorCode::TooLong);
        require!(location.len() <= MAX_LOCATION_LEN, ErrorCode::TooLong);
        require!(ctx.accounts.user_access.has_access, ErrorCode::Unauthorized);

        let crime_scene = &mut ctx.accounts.crime_scene;
        crime_scene.case_id = case_id;
        crime_scene.location = location;
        crime_scene.log_count = 0;
        crime_scene.evidence_count = 0;
        crime_scene.authority = ctx.accounts.authority.key();
        Ok(())
    }

    pub fn add_scene_log(
        ctx: Context<AddSceneLog>,
        timestamp: i64,
        description: String,
        officer_id: String,
    ) -> Result<()> {
        require!(description.len() <= MAX_DESCRIPTION_LEN, ErrorCode::TooLong);
        require!(officer_id.len() <= MAX_OFFICER_ID_LEN, ErrorCode::TooLong);
        require!(ctx.accounts.user_access.has_access, ErrorCode::Unauthorized);

        let crime_scene = &mut ctx.accounts.crime_scene;
        let log = &mut ctx.accounts.scene_log;

        log.crime_scene = crime_scene.key();
        log.timestamp = timestamp;
        log.description = description;
        log.officer_id = officer_id;
        log.log_number = crime_scene.log_count;

        crime_scene.log_count += 1;
        Ok(())
    }

    pub fn add_evidence(
        ctx: Context<AddEvidence>,
        evidence_id: String,
        description: String,
        location_found: String,
    ) -> Result<()> {
        require!(evidence_id.len() <= MAX_CASE_ID_LEN, ErrorCode::TooLong);
        require!(description.len() <= MAX_DESCRIPTION_LEN, ErrorCode::TooLong);
        require!(location_found.len() <= MAX_LOCATION_LEN, ErrorCode::TooLong);
        require!(ctx.accounts.user_access.has_access, ErrorCode::Unauthorized);

        let crime_scene = &mut ctx.accounts.crime_scene;
        let evidence = &mut ctx.accounts.evidence;

        evidence.crime_scene = crime_scene.key();
        evidence.evidence_id = evidence_id;
        evidence.description = description;
        evidence.location_found = location_found;
        evidence.log_count = 0;
        evidence.evidence_number = crime_scene.evidence_count;

        crime_scene.evidence_count += 1;
        Ok(())
    }

    pub fn add_evidence_log(
        ctx: Context<AddEvidenceLog>,
        timestamp: i64,
        action: String,
        handler: String,
        notes: String,
    ) -> Result<()> {
        require!(action.len() <= MAX_ACTION_LEN, ErrorCode::TooLong);
        require!(handler.len() <= MAX_HANDLER_LEN, ErrorCode::TooLong);
        require!(notes.len() <= MAX_NOTES_LEN, ErrorCode::TooLong);
        require!(ctx.accounts.user_access.has_access, ErrorCode::Unauthorized);

        let evidence = &mut ctx.accounts.evidence;
        let log = &mut ctx.accounts.evidence_log;

        log.evidence = evidence.key();
        log.timestamp = timestamp;
        log.action = action;
        log.handler = handler;
        log.notes = notes;
        log.log_number = evidence.log_count;

        evidence.log_count += 1;
        Ok(())
    }
}

#[account]
pub struct AccessControl {
    pub wallet: Pubkey,
    pub has_access: bool,
    pub granted_by: Pubkey,
    pub admin: Pubkey,
}

#[account]
pub struct CrimeScene {
    pub case_id: String,
    pub location: String,
    pub log_count: u64,
    pub evidence_count: u64,
    pub authority: Pubkey,
}

#[account]
pub struct SceneLog {
    pub crime_scene: Pubkey,
    pub timestamp: i64,
    pub description: String,
    pub officer_id: String,
    pub log_number: u64,
}

#[account]
pub struct Evidence {
    pub crime_scene: Pubkey,
    pub evidence_id: String,
    pub description: String,
    pub location_found: String,
    pub log_count: u64,
    pub evidence_number: u64,
}

#[account]
pub struct EvidenceLog {
    pub evidence: Pubkey,
    pub timestamp: i64,
    pub action: String,
    pub handler: String,
    pub notes: String,
    pub log_number: u64,
}

#[derive(Accounts)]
pub struct InitializeAccessControl<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 1 + 32 + 32,
        seeds = [b"access-control", authority.key().as_ref()],
        bump
    )]
    pub access_control: Account<'info, AccessControl>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GrantAccess<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 1 + 32 + 32,
        seeds = [b"user-access", wallet.key().as_ref()],
        bump
    )]
    pub access_control: Account<'info, AccessControl>,
    pub admin_access: Account<'info, AccessControl>,
    /// CHECK: Used for PDA seed
    pub wallet: AccountInfo<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeAccess<'info> {
    #[account(mut)]
    pub access_control: Account<'info, AccessControl>,
    pub admin_access: Account<'info, AccessControl>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(case_id: String, location: String)]
pub struct InitializeCrimeScene<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 4 + case_id.len() + 4 + location.len() + 8 + 8 + 32,
        seeds = [b"crime-scene", case_id.as_bytes()],
        bump,
    )]
    pub crime_scene: Account<'info, CrimeScene>,
    pub user_access: Account<'info, AccessControl>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddSceneLog<'info> {
    #[account(mut, has_one = authority)]
    pub crime_scene: Account<'info, CrimeScene>,
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + 4 + MAX_DESCRIPTION_LEN + 4 + MAX_OFFICER_ID_LEN + 8,
        seeds = [b"scene-log", crime_scene.key().as_ref(), &crime_scene.log_count.to_le_bytes()],
        bump,
    )]
    pub scene_log: Account<'info, SceneLog>,
    pub user_access: Account<'info, AccessControl>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddEvidence<'info> {
    #[account(mut, has_one = authority)]
    pub crime_scene: Account<'info, CrimeScene>,
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 4 + MAX_CASE_ID_LEN + 4 + MAX_DESCRIPTION_LEN + 4 + MAX_LOCATION_LEN + 8 + 8,
        seeds = [b"evidence", crime_scene.key().as_ref(), &crime_scene.evidence_count.to_le_bytes()],
        bump,
    )]
    pub evidence: Account<'info, Evidence>,
    pub user_access: Account<'info, AccessControl>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddEvidenceLog<'info> {
    #[account(mut)]
    pub evidence: Account<'info, Evidence>,
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + 4 + MAX_ACTION_LEN + 4 + MAX_HANDLER_LEN + 4 + MAX_NOTES_LEN + 8,
        seeds = [b"evidence-log", evidence.key().as_ref(), &evidence.log_count.to_le_bytes()],
        bump,
    )]
    pub evidence_log: Account<'info, EvidenceLog>,
    pub user_access: Account<'info, AccessControl>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("String length exceeds maximum allowed length.")]
    TooLong,
    #[msg("Wallet already has access")]
    AlreadyHasAccess,
    #[msg("Wallet does not have access")]
    NoAccess,
    #[msg("Unauthorized to perform this action")]
    Unauthorized,
    #[msg("Invalid admin")]
    InvalidAdmin,
}