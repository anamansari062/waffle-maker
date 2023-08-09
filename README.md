# waffle-maker

> Creates Waffle 🧇
> 

### Prequisites ✍️

1. Rust (rustup 1.26.0)
    
    [Install Rust](https://www.rust-lang.org/tools/install)
    
2. Solana CLI (solana-cli 1.16.7)
    
    [Install the Solana Tool Suite | Solana Docs](https://docs.solana.com/cli/install-solana-cli-tools)
    
3. Anchor CLI (anchor-cli 0.28.0)
    
    [Installation - Docs](https://www.anchor-lang.com/docs/installation)
    
4. yarn
    
    ```rust
    # Using npm global dependencies.
    npm install -g yarn
    
    # Using homebrew on Mac.
    brew install yarn
    
    # Using apt on Linux
    apt install yarn
    ```
    

### Code 💻

- Anchor Program Setup
    1. Initialize
        
        ```rust
        anchor init waffle-maker
        ```
        
    2. Change Cluster to Localnet
        
        ```rust
        solana config set --url localhost
        ```
        
    3. Build and Deploy (Don’t forget to `cd` into the directory)
        
        ```rust
        anchor build
        ```
        
        Run `solana-test-validator` in another terminal, before running below command, only if you are on localhost
        
        ```rust
        anchor deploy
        ```
        
    4. Replace program id in [lib.rs](http://lib.rs) and Anchor.toml
    5. Anchor Test
        
        ```rust
        anchor test
        ```
        
- Program
    
    In  `waffle-maker/programs/waffle-maker/src/lib.rs` , Remove `struct Initialize` and the function `initialize`
    
    1. Waffle Account : We define a `Waffle` struct and declare it as an `account` using           `#[account]` provided by Anchor. We will store author’s Public Key, timestamp and the topic of the waffle in this Account. 
        
        ```rust
        #[account]
        pub struct Waffle {
            pub author: Pubkey,
            pub name: String,
        }
        ```
        
    2. Rent and Size of Waffle: We have to calculate the size of the `Waffle` Account as we will be paying Rent to store our account on chain. 
    - Discriminator is always added before every Account, to define which Account it is.
    - Rest others are the sizes of the respective fields of the `Waffle` Account. 
    - In an Account, there should be a 4 byte extra space for any String, if present. This extra space defines the length of the String. 
    - Right now, we have not defined the space for `name` as it will be dynamic based on user inputs.
        
        ```rust
        const DISCRIMINATOR_LENGTH: usize = 8;
        const PUBLIC_KEY_LENGTH: usize = 32;
        const STRING_LENGTH_PREFIX: usize = 4; 
        ```
        
    3. Implementation Block for Waffle: 
        
        `impl` blocks of a `struct` stores all the functions and constants related to that struct. We have calculated the length of the `Waffle` account. There is also a function `new` which creates an instance of the `Waffle` account. These will be handy when we write the `CreateWaffle` instruction. 
        
        ```rust
        impl Waffle {
        
            pub const LEN: usize = DISCRIMINATOR_LENGTH
                + PUBLIC_KEY_LENGTH
                + STRING_LENGTH_PREFIX;
        
            pub fn new(author: Pubkey, name: String) -> Self {
                Waffle {
                    author,
                    name
                }
            }
        }
        ```
        
    4. Create Waffle instruction: In Anchor, we need to define a `struct` for every instruction, it contains all accounts, programs associated with the instruction and the signer. Here:
    - `waffle` is an Account of type `Waffle`
    - `author` is the `Signer` (An Anchor Type)
    - `system_program` is `Program` , it has instructions to create an Account, as we will be creating the `Waffle` account, we have to include `system_program` 
    - `<'info>` is a lifetime, it means that all the contents will have the same lifetime as `CreateWaffle`
        
        ```rust
        #[derive(Accounts)]
        pub struct CreateWaffle<'info> {
            pub waffle: Account<'info, Waffle>,
            pub author: Signer<'info>,
            pub system_program: Program<'info, System>,
        }
        ```
        
    5. Account Constraints: We need to still add some constraints inside the `CreateWaffle` function. 
    - `waffle` account gets `init_if_needed` as a constraint as it will be initialized the first time and also if we re-intialize it again, it wont do. We also define who will be paying to create this account i.e. `author` . And finally we allot the space required for the account using `Waffle::LEN() + name.len()`. `Waffle::Len()` is from the `impl` block which we wrote before. `name` comes from the user and to add that in the instruction struct we use `#[instruction(name: String)]`. `seeds` constraint is used for Program Derived Address, it takes “waffle” and the `name` of the waffle. To make an account a PDA, you need seeds. 
    - `author` is given `mut` as constraint as when it pays for the account creation, some Sol will be deducted and hence this account has to be mutable. 
        
        ```rust
        #[derive(Accounts)]
        #[instruction(name: String)]
        pub struct CreateWaffle<'info> {
            #[account(
                init_if_needed, 
                payer = author, 
                space = Waffle::LEN + name.len(),
                seeds = [b"waffle", name.as_bytes()], 
            )]
            pub waffle: Account<'info, Waffle>,
            
        	#[account(mut)]
            pub author: Signer<'info>,
            pub system_program: Program<'info, System>,
        }
        ```
        
    6. To add `init_if_needed` as a feature, in `waffle-maker/programs/waffle-maker/Cargo.toml`
        
        ```rust
        [dependencies]
        anchor-lang = {version = "0.28.0", features = ["init-if-needed"]}
        ```
        
    7. Implementing `CreateWaffle` function (Should be added inside `mod waffle_maker` ) :
    This is the function which gets called when we create a waffle, it takes `CreateWaffle` struct as `Context` .
        
        ```rust
        pub fn create_waffle (ctx: Context<CreateWaffle>, name: String) -> Result<()> {
            Ok(())
        }
        ```
        
    8. Define Errors (Outside `mod waffle_maker` ):
    This enum will be handy to check errors. 
        
        ```rust
        #[error_code]
        pub enum WaffleError {
            #[msg("Waffle name can be 30 characters long.")]
            NameTooLong,
            #[msg("You need to name the Waffle.")]
            NameEmpty,
        }
        ```
        
    9. Handle Errors (Inside `create_waffle` function) : 
    We check for errors and accordingly take actions.
        
        ```rust
        require!(name.chars().count() > 30, WaffleError::NameTooLong);
        require!(name.chars().count() < 1, WaffleError::NameEmpty);
        ```
        
    10. Assign value (Inside `create_waffle` function) :
    After error checking, we assign value inside the waffle account. 
        
        ```rust
        ctx.accounts.waffle.author = ctx.accounts.author.key();
        ctx.accounts.waffle.name = name;
        ```
        
    11. Adding a log message
        
        ```rust
        msg!("Waffle {} created", &ctx.accounts.waffle.name);
        ```
        
    12. Switch to Devent
        
        ```rust
        solana config set --url devnet
        ```
        
        In `waffle-maker/Anchor.toml` replace cluster to Devnet
        
        ```rust
        [provider]
        cluster = "Devnet"
        ```
        
        Also add 
        
        ```rust
        [programs.devnet]
        waffle_maker = <program-id-in-string>
        ```
        
    13. Anchor Build and Deploy
        
        ```rust
        anchor build
        ```
        
        ```rust
        anchor deploy
        ```
        
    14. Copy the IDL file `waffle-maker/target/idl/waffle_maker.json`
- Whole Code
    
    `waffle-maker/programs/waffle-maker/src/lib.rs`
    
    ```rust
    use anchor_lang::prelude::*;
    
    declare_id!("B6cnkQKZeNT4VEmkjfNfisL4UzobUfL5wU93xi16DSTU");
    
    #[program]
    pub mod waffle_maker {
        use super::*;
    
        pub fn create_waffle (ctx: Context<CreateWaffle>, name: String) -> Result<()> {
            
            require!(name.chars().count() < 30, WaffleError::NameTooLong);
            require!(name.chars().count() > 1, WaffleError::NameEmpty);
    
            ctx.accounts.waffle.author = ctx.accounts.author.key();
            ctx.accounts.waffle.name = name;
    
            msg!("Waffle {} created", &ctx.accounts.waffle.name);
    
            Ok(())
        }
    }
    
    #[account]
    pub struct Waffle {
        pub author: Pubkey,
        pub name: String,
    }
    
    const DISCRIMINATOR_LENGTH: usize = 8;
    const PUBLIC_KEY_LENGTH: usize = 32;
    const STRING_LENGTH_PREFIX: usize = 4; 
    
    impl Waffle {
    
        pub const LEN: usize = DISCRIMINATOR_LENGTH
            + PUBLIC_KEY_LENGTH
            + STRING_LENGTH_PREFIX;
    
        pub fn new(author: Pubkey, name: String) -> Self {
            Waffle {
                author,
                name
            }
        }
    }
    
    #[derive(Accounts)]
    #[instruction(name: String)]
    pub struct CreateWaffle<'info> {
        #[account(
            init_if_needed, 
            payer = author, 
            space = Waffle::LEN + name.len(),
            seeds = [b"waffle", name.as_bytes()],
            bump 
        )]
        pub waffle: Account<'info, Waffle>,
        
    	#[account(mut)]
        pub author: Signer<'info>,
        pub system_program: Program<'info, System>,
    }
    
    #[error_code]
    pub enum WaffleError {
        #[msg("Waffle name can be 30 characters long.")]
        NameTooLong,
        #[msg("You need to name the Waffle.")]
        NameEmpty,
    }
    ```