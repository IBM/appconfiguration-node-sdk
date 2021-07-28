# Example Application

> **DISCLAIMER**: This is a guideline example application and is used for demonstrative and illustrative purposes only. This is not a production ready code.

## Step 1: Create an instance of App Configuration service
- Log in to your IBM Cloud account.
- In the [IBM Cloud catalog](https://cloud.ibm.com/catalog#services), search **App Configuration** and select [App Configuration](https://cloud.ibm.com/catalog/services/app-configuration). The service configuration screen opens.
- **Select a region** - Currently, Dallas (us-south), London (eu-gb) and Sydney (au-syd) regions are supported.
- Select a pricing plan, resource group and configure your resource with a service name, or use the preset name.
- Click **Create**. A new service instance is created and the App Configuration console displayed.

## Step 2: Generate Service Credentials
- Go to dashboard page of App Configuration service instance in the IBM Cloud UI.
- Navigate to Service Credentials section and generate a new set of credentials. Provide the generated `region`, `guid` and `apikey` values in [environment file](.env#1).
## Step 3: Create a collection, segment, feature flag & add targeting to feature flag
- On to dashboard page of App Configuration service instance created, navigate to Collections section and create a collection by clicking on create button.
    ```
    //Collection details

    Name: Car Rentals
    Collection ID: car-rentals
    ```
- On the same instance, navigate to Segments section and create a segment by clicking on create button.
    ```
    //Segment details

    Name: Users from Bangalore urban area
    Add rule one: 
                    Attribute name: city
                    Operator: is
                    Values: Bangalore
    Add rule two: 
                    Attribute name: radius
                    Operator: less than and equals
                    Values: 60

    ```
- Again on the same instance, navigate to Feature flags section and create a feature flag by clicking on create button.
    ```
    //Feature flag details

    Name: Weekend discount
    Feature flag ID: weekend-discount
    Flag type: Numeric
    Enabled value: 10
    Disabled value: 0
    Add this feature flag to the above collection created "Car Rentals"
    ```
- Navigate to Properties section and create a property by clicking on create button.
    ```
    //Property details

    Name: User's location
    Property ID: users-location
    Property type: String
    Default value: other
    Add this property to the above collection created "Car Rentals"
    ```
- Click `Add targeting` on the feature flag created & target this feature flag to the segment.
    ```
    Select the segment "Users from Bangalore urban area" from the dropdown.
    Choose Override enabled value, and give some value(say 25) in the textarea.
    Click Save rule & Add the targeting.
    ```
- Click `Add targeting` on the property created & target this property to the segment.
    ```
    Select the segment "Users from Bangalore urban area" from the dropdown.
    Choose Override enabled value, and give the value(say "Bangalore") in the textarea.
    Click Save rule & Add the targeting.
    ```

## Step 4: Run the app
```bash
$ cd examples
$ npm install
$ npm start
```
- Access the running app in a browser at http://localhost:3000
  - Get single feature - http://localhost:3000/getfeature
  - Get all features - http://localhost:3000/getfeatures
  - Get single property - http://localhost:3000/getproperty
  - Get all properties - http://localhost:3000/getproperties
