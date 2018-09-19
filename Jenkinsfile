#!groovy
DOCKER_ORG='artifactory.dev.adskengineer.net/autodeskcloud'
DOCKER_REGISTRY='https://artifactory.dev.adskengineer.net/artifactory/docker-local-v2/'
DOCKER_CREDENTIALS='artifactory-deploy-dev'
NODE_IMAGE='artifactory.dev.adskengineer.net/quantum-devops/cloudos-v2/base-nodejs8:latest'
BUILD_VERSION="0.0.${BUILD_NUMBER}"
SAFE_BRANCH_NAME=BRANCH_NAME.replaceAll('/','-')
DOCKER_TAG=SAFE_BRANCH_NAME + "-${BUILD_VERSION}"
DOCKER_ARGS="DOCKER_ORG=${DOCKER_ORG} DOCKER_TAG=${DOCKER_TAG}"
currentBuild.displayName = DOCKER_TAG

buildArgs="${DOCKER_ARGS} BUILD_NAME=${DOCKER_TAG}"

@Library('PSL@master') _

node('cloud&&centos') { timestamps {

    try {

        // pull source, then force cleanup of untracked files and dirs
        stage('Pull source') {
            def gitInfo = checkout scm
            def gitCommit = gitInfo["GIT_COMMIT"]
            buildArgs = buildArgs + " BUILD_COMMIT=${gitCommit}"
            sh "git clean -fxd"
        }

        // TODO: uncomment this once Checkmarx team is configured
        //
        // stage('Checkmarx Scan') {
        //     timeout(time: 120, unit: 'MINUTES') {
        //         scan = new ors.security.common_appsec(steps,env)
        //         scan.run_sast_scan(
        //             "repo": "package-manager",
        //             "branch": env.BRANCH_NAME,
        //             "mainline": "master",
        //             "team": "Dynamo",
        //             "scan_dir": env.WORKSPACE,
        //             "fail_on_sast_priority": "True",
        //             "files_exclude": ".*",
        //             "folders_exclude": ".*, test, node_modules"
        //         )
        //     }
        // }

        try {
            stage('Build') {
                sh "${buildArgs} make docker_build"
            }

            stage('Test') {
                sh "${buildArgs} make docker_test"

                // TODO: to make cobertura work, we need to generate
                // a coverage.xml file. See https://istanbul.js.org/
                // for one possible approach
                //
                // cobertura(
                //     coberturaReportFile: "coverage.xml",
                //     lineCoverageTargets: "30,30,0"
                // )
            }

            stage('WhiteSource Scan') {
                // To scan our dependencies, we need to load them
                docker.image(NODE_IMAGE).inside('-u root') {
                    sh "npm ci"
                }
                scan = new ors.security.common_appsec(steps,env)
                scan.run_oast_scan(
                    "repo": "package-manager",
                    "branch": env.BRANCH_NAME,
                    "mainline": "master",
                    "team": "Dynamo",
                    "scan_dir": ["${env.WORKSPACE}/node_modules"],
                    "fail_on_oast": "True"
                )
            }

            stage('Docker Push') {
                docker.withRegistry(DOCKER_REGISTRY, DOCKER_CREDENTIALS) {
                    sh "${buildArgs} make docker_push"
                }
            }
        } finally {
            stage("Cleanup docker image") {
                sh "${buildArgs} make docker_clean"
            }
        }

        if ("${BRANCH_NAME}" == "master") {
            stage("Trigger Application CI") {
                build(job: '../dynamopm-app/master', wait: false)
            }
        }
    } catch (e) {
        // If there was an exception thrown, the build failed
        currentBuild.result = "FAILED"
        throw e
    } finally {
        // Success or failure, always send notifications
        notifyBuild(currentBuild.result)
    }
}}

def notifyBuild(String buildStatus) {
    // build status of null means successful
    buildStatus =  buildStatus ?: 'SUCCESS'

    // Determine color based on build status.
    // These values provide good discrimination for common color blindness types.
    // source: http://mkweb.bcgsc.ca/biovis2012
    def colorCode = '#24FF24'

    if (buildStatus == 'FAILURE') {
        colorCode = '#920000'
    }

    withCredentials([[$class: 'StringBinding', credentialsId: 'slack-notify-token', variable: 'mytoken']]) {
        slackSend (color: colorCode, teamDomain: 'autodesk', token: env.mytoken,
            message: "${buildStatus}: Job ${JOB_NAME} [${BUILD_NUMBER}] (<${BUILD_URL}|Build Data>)",
            channel: '#dynamo-jenkinsbuild')
    }
}
