# Simulated ID chain

In order to speedup tests execution, a simulated DID chain is available and enabled by default for tests for now.

Running the simulated chain is mandatory to run the tests. The command is as following:

**```npm run simchain```** from the tests/ folder.

*For more details about the simulated chain capabilities, please read the information below.*

## 1 Command line

```bash
$ java -jar tools/did.jar simchain --help
Usage: org.elastos.did.util.Main simchain [-ehV] [-i=<host>] [-p=<port>] [-l=<level>]
Simulated ID Chain for testing.
  -i, --interface=<host>   Server interface, default: localhost
  -p, --port=<port>        Server port, default 9123.
  -e, --verbase            Verbose error output, default false.
  -l, --loglevel=<level>   Log level, default is info(trace, debug, info, warn,
                           error).
  -h, --help               Show this help message and exit.
  -V, --version            Print version information and exit.
```

## 2 HTTP APIs

### 2.1 Create ID transaction

**Endpoint**: /idtx

**Method**: POST

**Content-Type**: application/json

**Request Body**: Any ID Chain request payload, include DID and VerifiableCredential operations.

**Response Body**: None

**Success Status**: 202

### 2.2 Resolve

**Endpoint**: /resolve

**Method**: POST

**Content-Type**: application/json

**Request Body**: Any DID or VC resolve/list request.

**Response Body**: Resolved result.

**Success Status**: 200

### 2.3 Reset test data

**Endpoint**: /reset

**URL Parameters**:

idtxsonly - if has this parameter, only reset id transactions.

vctxsonly - if has this parameter, only reset vc transactions.

If no URL parameters, will reset all transactions(include id and vc transactions).

**Method**: POST

**Request Body**: None

**Response Body**: None

**Success Status**: 200

**Examples**:

Reset all transactions

```bash
/reset
```

Reset all ID transactions

```bash
/reset?idtxsonly
```

Reset all credential transactions

```bash
/reset?vctxsonly
```

### 2.4 Shutdown the simulated ID chain

**Endpoint**: /shutdown

**Method**: POST

**Request Body**: None

**Response Body**: None

**Success Status**: 202