# Original/DIP lib

## Setup
```
sudo apt-get install postgresql
sudo -u postgres psql -c "CREATE DATABASE postchain; CREATE DATABASE postchain_test;" -c "CREATE ROLE postchain LOGIN ENCRYPTED PASSWORD 'postchain'; GRANT ALL ON DATABASE postchain TO postchain; GRANT ALL ON DATABASE postchain_test TO postchain;"
```

Download the ft3-lib from [here](https://bitbucket.org/chromawallet/ft3-lib/src/master/) and put the ft3-lib/rell/src/lib/ft3 folder in originals-dip/rell/src/.

## Eclipse console highlight for tests
This plugin enhances readability of the console output from tests. Successfully run tests get highlighted green and failed tests red.

- Get thist plugin: http://marian.schedenig.name/projects/grep-console/installation/
    - Marketplace URL: http://eclipse.schedenig.name
    - Select "Grep Console"
    - Wait for install and restart Eclipse
- Click on the little question mark icon (?) (called Manage Expressions) that now appears on the top right of the console output window.
- Click "Load" and import the `rell_test_grep.xml` for better highlighting.

## Testing

Each unit test is a test module. To specify which module should be tested, modify the entry point in line 22 of `run.xml`. Run the tests by pressing Run while having the `run.xml` file open and select `Rell Unit Test`. 

## Run (if eclipse plugin not available)

### Dev node
    bash run-dev-node.sh
